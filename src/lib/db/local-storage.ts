import { supabase } from './supabase-client';
import {
  Brand,
  BrandBlock,
  Marker,
  NamingCandidate,
  KnowledgeItem,
  Rule,
  AgentRun,
  ShareLink,
  Member,
  MemberRole,
  BlockStatus,
  SlideComment,
  ActivityLog,
} from './types';
import { parseMarkers } from '../utils/markers';

// ---------------------------------------------------------------------------
// AUTHENTICATION (Google OAuth via Supabase Auth)
// ---------------------------------------------------------------------------

async function getCurrentUser(): Promise<Member | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  // Look up member record
  const { data: member } = await supabase
    .from('sb_members')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single();

  if (member) {
    return {
      ...member,
      avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
    } as Member;
  }

  // Auto-create member on first login
  const { data: newMember, error } = await supabase
    .from('sb_members')
    .insert({
      auth_user_id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
      role: 'admin',
    })
    .select()
    .single();

  if (error) {
    console.error('[db] Failed to create member:', error);
    return null;
  }
  return {
    ...newMember,
    avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
  } as Member;
}

async function loginWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    console.error('[db] Google login error:', error);
    throw error;
  }
}

async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null;
}

// ---------------------------------------------------------------------------
// PERMISSIONS, MEMBERS & ACTIVITY LOGS
// ---------------------------------------------------------------------------
async function checkWritePermission(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado.');
  if (user.role !== 'admin' && user.can_write === false) {
    throw new Error('No tienes permisos de escritura.');
  }
}

async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('sb_members')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[db] Error fetching members:', error);
    return [];
  }
  return (data || []).map(m => ({
    ...m,
    allowed_brands: m.allowed_brands || [],
    can_write: m.can_write !== false
  })) as Member[];
}

async function updateMemberPermissions(
  id: string,
  role: MemberRole,
  allowed_brands: string[],
  can_write: boolean
): Promise<boolean> {
  await checkWritePermission();
  const { error } = await supabase
    .from('sb_members')
    .update({ role, allowed_brands, can_write })
    .eq('id', id);

  if (error) {
    console.error('[db] Error updating member permissions:', error);
    return false;
  }
  
  // Log the permission change
  const { data: targetMember } = await supabase.from('sb_members').select('email').eq('id', id).single();
  if (targetMember) {
    await createActivityLog(
      'update_permissions',
      `Modificó los permisos del usuario ${targetMember.email}: rol=${role}, marcas=[${allowed_brands.join(', ')}], escritura=${can_write}`
    );
  }
  return true;
}

async function getActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('sb_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.error('[db] Error fetching activity logs:', error);
    return [];
  }
  return data || [];
}

async function createActivityLog(action: string, details: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    
    await supabase.from('sb_activity_logs').insert({
      member_id: user.id,
      email: user.email,
      action,
      details
    });
  } catch (err) {
    console.error('[db] Failed to log activity:', err);
  }
}

// ---------------------------------------------------------------------------
// Helper: get current member ID
// ---------------------------------------------------------------------------
async function getMemberId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

// ---------------------------------------------------------------------------
// BRANDS
// ---------------------------------------------------------------------------
async function getBrands(): Promise<Brand[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('sb_brands')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[db] getBrands:', error); return []; }

  // If user is not an admin, filter brands to only those in allowed_brands
  if (user.role !== 'admin') {
    const allowed = user.allowed_brands || [];
    return (data as Brand[]).filter(b => allowed.includes(b.id));
  }

  return data as Brand[];
}

async function getBrand(id: string): Promise<Brand | undefined> {
  const user = await getCurrentUser();
  if (!user) return undefined;

  // Enforce brand scope
  if (user.role !== 'admin') {
    const allowed = user.allowed_brands || [];
    if (!allowed.includes(id)) return undefined;
  }

  const { data, error } = await supabase
    .from('sb_brands')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return undefined;
  return data as Brand;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createBrand(input: { name: string }): Promise<Brand> {
  await checkWritePermission();
  const memberId = await getMemberId();
  const { data, error } = await supabase
    .from('sb_brands')
    .insert({
      name: input.name,
      slug: slugify(input.name),
      created_by: memberId,
    })
    .select()
    .single();

  if (error) {
    console.error('[db] createBrand:', error);
    throw error;
  }
  await createActivityLog('create_brand', `Creó la marca '${input.name}'`);
  return data as Brand;
}

async function updateBrand(
  id: string,
  data: Partial<Omit<Brand, 'id' | 'created_at' | 'created_by'>>
): Promise<Brand | undefined> {
  await checkWritePermission();
  const updateData: Record<string, unknown> = { ...data };
  if (data.name && !data.slug) {
    updateData.slug = slugify(data.name);
  }
  const { data: updated, error } = await supabase
    .from('sb_brands')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error('[db] updateBrand:', error); return undefined; }
  await createActivityLog('update_brand', `Actualizó la marca '${updated.name}'`);
  return updated as Brand;
}

async function deleteBrand(id: string): Promise<boolean> {
  await checkWritePermission();
  const { data: brand } = await supabase.from('sb_brands').select('name').eq('id', id).single();
  const { error } = await supabase
    .from('sb_brands')
    .delete()
    .eq('id', id);
  if (error) { console.error('[db] deleteBrand:', error); return false; }
  if (brand) {
    await createActivityLog('delete_brand', `Eliminó la marca '${brand.name}'`);
  }
  return true; // Cascade delete handles related tables
}

// ---------------------------------------------------------------------------
// BRAND BLOCKS
// ---------------------------------------------------------------------------
async function getBrandBlocks(brandId: string): Promise<BrandBlock[]> {
  const { data, error } = await supabase
    .from('sb_brand_blocks')
    .select('*')
    .eq('brand_id', brandId)
    .order('block_id');
  if (error) { console.error('[db] getBrandBlocks:', error); return []; }

  const blocks = data as BrandBlock[];
  const existingIds = new Set(blocks.map(b => b.block_id));
  const missingIds = [];
  for (let i = 1; i <= 13; i++) {
    if (!existingIds.has(i)) {
      missingIds.push(i);
    }
  }

  if (missingIds.length > 0) {
    console.log(`[db] getBrandBlocks: Brand ${brandId} is missing blocks: ${missingIds.join(', ')}. Auto-creating...`);
    const newBlocksPayload = missingIds.map(id => ({
      brand_id: brandId,
      block_id: id,
      content_md: '',
      status: 'vacio' as const,
    }));
    
    const { data: insertedBlocks, error: insertError } = await supabase
      .from('sb_brand_blocks')
      .insert(newBlocksPayload)
      .select();

    if (insertError) {
      console.error('[db] Failed to auto-create missing blocks:', insertError);
    } else if (insertedBlocks) {
      blocks.push(...(insertedBlocks as BrandBlock[]));
      blocks.sort((a, b) => a.block_id - b.block_id);
    }
  }

  return blocks;
}

async function updateBrandBlock(
  brandId: string,
  blockId: number,
  input: Partial<Pick<BrandBlock, 'content_md' | 'status' | 'updated_by'>>
): Promise<BrandBlock | undefined> {
  await checkWritePermission();
  const memberId = await getMemberId();
  const updateData: Record<string, unknown> = { ...input };
  if (memberId) {
    updateData.updated_by = memberId;
  }

  // Use upsert to handle cases where the block record was not pre-created
  const { data, error } = await supabase
    .from('sb_brand_blocks')
    .upsert(
      {
        brand_id: brandId,
        block_id: blockId,
        ...updateData,
      },
      {
        onConflict: 'brand_id,block_id',
      }
    )
    .select()
    .single();
  if (error) {
    console.error('[db] updateBrandBlock:', error, { brandId, blockId, updateData });
    return undefined;
  }

  // Log activity
  if (input.content_md !== undefined) {
    await createActivityLog('update_block', `Actualizó el contenido del bloque ${blockId} para la marca`);
  } else if (input.status !== undefined) {
    await createActivityLog('update_block_status', `Cambió el estado del bloque ${blockId} a '${input.status}'`);
  }

  // Sync markers if content changed
  if (input.content_md !== undefined) {
    await syncMarkersFromContent(brandId, blockId, input.content_md);
  }

  return data as BrandBlock;
}

// ---------------------------------------------------------------------------
// MARKERS
// ---------------------------------------------------------------------------
async function getMarkers(brandId: string): Promise<Marker[]> {
  const { data, error } = await supabase
    .from('sb_markers')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at');
  if (error) { console.error('[db] getMarkers:', error); return []; }
  return data as Marker[];
}

async function createMarker(input: {
  brand_id: string;
  block_id: number;
  type: Marker['type'];
  text: string;
  blocks_what?: string | null;
}): Promise<Marker> {
  await checkWritePermission();
  const { data, error } = await supabase
    .from('sb_markers')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Marker;
}

async function resolveMarker(id: string): Promise<Marker | undefined> {
  await checkWritePermission();
  const { data, error } = await supabase
    .from('sb_markers')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return undefined;
  return data as Marker;
}

async function deleteMarker(id: string): Promise<boolean> {
  await checkWritePermission();
  const { error } = await supabase.from('sb_markers').delete().eq('id', id);
  return !error;
}

async function syncMarkersFromContent(
  brandId: string,
  blockId: number,
  content: string
): Promise<void> {
  await checkWritePermission();
  const parsed = parseMarkers(content);

  // Get existing unresolved markers for this block
  const { data: existing } = await supabase
    .from('sb_markers')
    .select('*')
    .eq('brand_id', brandId)
    .eq('block_id', blockId)
    .eq('resolved', false);

  const existingMarkers = (existing || []) as Marker[];
  const existingSignatures = new Set(existingMarkers.map(m => `${m.type}::${m.text}`));
  const parsedSignatures = new Set(parsed.map(p => `${p.type}::${p.text}`));

  // Add new markers
  const newMarkers = parsed.filter(p => !existingSignatures.has(`${p.type}::${p.text}`));
  if (newMarkers.length > 0) {
    await supabase.from('sb_markers').insert(
      newMarkers.map(m => ({
        brand_id: brandId,
        block_id: blockId,
        type: m.type,
        text: m.text,
      }))
    );
  }

  // Auto-resolve markers no longer in content
  const toResolve = existingMarkers.filter(m => !parsedSignatures.has(`${m.type}::${m.text}`));
  if (toResolve.length > 0) {
    await supabase
      .from('sb_markers')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .in('id', toResolve.map(m => m.id));
  }
}

// ---------------------------------------------------------------------------
// NAMING CANDIDATES
// ---------------------------------------------------------------------------
async function getNamingCandidates(brandId: string): Promise<NamingCandidate[]> {
  const { data, error } = await supabase
    .from('sb_naming_candidates')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at');
  if (error) { console.error('[db] getNamingCandidates:', error); return []; }
  return data as NamingCandidate[];
}

async function createNamingCandidate(input: {
  brand_id: string;
  name: string;
  rationale_md: string;
  status?: NamingCandidate['status'];
}): Promise<NamingCandidate> {
  await checkWritePermission();
  const { data, error } = await supabase
    .from('sb_naming_candidates')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  await createActivityLog('create_naming_candidate', `Creó el candidato de naming '${input.name}'`);
  return data as NamingCandidate;
}

async function updateNamingCandidate(
  id: string,
  input: Partial<Omit<NamingCandidate, 'id' | 'brand_id' | 'created_at'>>
): Promise<NamingCandidate | undefined> {
  await checkWritePermission();
  const { data, error } = await supabase
    .from('sb_naming_candidates')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) return undefined;
  await createActivityLog('update_naming_candidate', `Actualizó el candidato de naming '${data.name}' (status=${input.status})`);
  return data as NamingCandidate;
}

async function deleteNamingCandidate(id: string): Promise<boolean> {
  await checkWritePermission();
  const { data: candidate } = await supabase.from('sb_naming_candidates').select('name').eq('id', id).single();
  const { error } = await supabase.from('sb_naming_candidates').delete().eq('id', id);
  if (!error && candidate) {
    await createActivityLog('delete_naming_candidate', `Eliminó el candidato de naming '${candidate.name}'`);
  }
  return !error;
}

// ---------------------------------------------------------------------------
// KNOWLEDGE ITEMS
// ---------------------------------------------------------------------------
async function getKnowledgeItems(brandId: string): Promise<KnowledgeItem[]> {
  const { data, error } = await supabase
    .from('sb_knowledge_items')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at');
  if (error) { console.error('[db] getKnowledgeItems:', error); return []; }
  return data as KnowledgeItem[];
}

async function createKnowledgeItem(input: {
  brand_id: string;
  kind: KnowledgeItem['kind'];
  title: string;
  body_md: string;
  audience: string;
  verified?: boolean;
}): Promise<KnowledgeItem> {
  await checkWritePermission();
  const { data, error } = await supabase
    .from('sb_knowledge_items')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  await createActivityLog('create_knowledge_item', `Creó el ítem de conocimiento '${input.title}' (${input.kind})`);
  return data as KnowledgeItem;
}

async function updateKnowledgeItem(
  id: string,
  input: Partial<Omit<KnowledgeItem, 'id' | 'brand_id' | 'created_at'>>
): Promise<KnowledgeItem | undefined> {
  await checkWritePermission();
  const { data, error } = await supabase
    .from('sb_knowledge_items')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) return undefined;
  await createActivityLog('update_knowledge_item', `Actualizó el ítem de conocimiento '${data.title}'`);
  return data as KnowledgeItem;
}

async function deleteKnowledgeItem(id: string): Promise<boolean> {
  await checkWritePermission();
  const { data: item } = await supabase.from('sb_knowledge_items').select('title').eq('id', id).single();
  const { error } = await supabase.from('sb_knowledge_items').delete().eq('id', id);
  if (!error && item) {
    await createActivityLog('delete_knowledge_item', `Eliminó el ítem de conocimiento '${item.title}'`);
  }
  return !error;
}

// ---------------------------------------------------------------------------
// RULES
// ---------------------------------------------------------------------------
async function getRules(brandId: string, kind?: Rule['kind']): Promise<Rule[]> {
  let query = supabase
    .from('sb_rules')
    .select('*')
    .eq('brand_id', brandId)
    .order('sort');
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) { console.error('[db] getRules:', error); return []; }
  return data as Rule[];
}

async function createRule(input: {
  brand_id: string;
  kind: Rule['kind'];
  body_md: string;
  sort?: number;
}): Promise<Rule> {
  // Auto-calculate sort if not provided
  if (input.sort === undefined) {
    const existing = await getRules(input.brand_id, input.kind);
    input.sort = existing.length + 1;
  }
  const { data, error } = await supabase
    .from('sb_rules')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Rule;
}

async function updateRule(
  id: string,
  input: Partial<Omit<Rule, 'id' | 'brand_id'>>
): Promise<Rule | undefined> {
  const { data, error } = await supabase
    .from('sb_rules')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) return undefined;
  return data as Rule;
}

async function deleteRule(id: string): Promise<boolean> {
  const { error } = await supabase.from('sb_rules').delete().eq('id', id);
  return !error;
}

// ---------------------------------------------------------------------------
// AGENT RUNS
// ---------------------------------------------------------------------------
async function getAgentRuns(brandId: string): Promise<AgentRun[]> {
  const { data, error } = await supabase
    .from('sb_agent_runs')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[db] getAgentRuns:', error); return []; }
  return data as AgentRun[];
}

async function createAgentRun(input: {
  brand_id: string;
  block_id?: number;
  agent: AgentRun['agent'];
  input_text: string;
  output_md?: string;
  status?: AgentRun['status'];
}): Promise<AgentRun> {
  const memberId = await getMemberId();
  const { data, error } = await supabase
    .from('sb_agent_runs')
    .insert({ ...input, created_by: memberId })
    .select()
    .single();
  if (error) throw error;
  return data as AgentRun;
}

// ---------------------------------------------------------------------------
// SHARE LINKS
// ---------------------------------------------------------------------------
async function getShareLinks(brandId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from('sb_share_links')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[db] getShareLinks:', error); return []; }
  return data as ShareLink[];
}

async function createShareLink(input: {
  brand_id: string;
  password_hash: string;
  mode: ShareLink['mode'];
}): Promise<ShareLink> {
  const { data, error } = await supabase
    .from('sb_share_links')
    .insert({ ...input, active: true })
    .select()
    .single();
  if (error) throw error;
  return data as ShareLink;
}

async function deactivateShareLink(id: string): Promise<ShareLink | undefined> {
  const { data, error } = await supabase
    .from('sb_share_links')
    .update({ active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) return undefined;
  return data as ShareLink;
}

// ---------------------------------------------------------------------------
// GLOBAL SEARCH
// ---------------------------------------------------------------------------
interface SearchResult {
  type: 'block' | 'knowledge' | 'marker' | 'rule' | 'naming';
  brand_id: string;
  title: string;
  snippet: string;
  id: string;
}

async function searchGlobal(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // Search blocks via ilike
  const { data: blocks } = await supabase
    .from('sb_brand_blocks')
    .select('id, brand_id, block_id, content_md')
    .ilike('content_md', `%${q}%`)
    .limit(20);

  const blockDefs = await import('../data/block-definitions');

  if (blocks) {
    for (const block of blocks) {
      const def = blockDefs.BLOCK_DEFINITIONS.find((d: { id: number }) => d.id === block.block_id);
      const idx = block.content_md.toLowerCase().indexOf(q);
      const start = Math.max(0, idx - 40);
      const end = Math.min(block.content_md.length, idx + q.length + 40);
      results.push({
        type: 'block',
        brand_id: block.brand_id,
        title: def?.title || `Bloque ${block.block_id}`,
        snippet: '…' + block.content_md.slice(start, end) + '…',
        id: block.id,
      });
    }
  }

  // Search knowledge items
  const { data: knowledge } = await supabase
    .from('sb_knowledge_items')
    .select('id, brand_id, title, body_md')
    .or(`title.ilike.%${q}%,body_md.ilike.%${q}%`)
    .limit(10);

  if (knowledge) {
    for (const item of knowledge) {
      results.push({
        type: 'knowledge',
        brand_id: item.brand_id,
        title: item.title,
        snippet: item.body_md.slice(0, 80),
        id: item.id,
      });
    }
  }

  // Search markers
  const { data: markers } = await supabase
    .from('sb_markers')
    .select('id, brand_id, type, text')
    .ilike('text', `%${q}%`)
    .limit(10);

  if (markers) {
    for (const m of markers) {
      results.push({
        type: 'marker',
        brand_id: m.brand_id,
        title: `[${m.type}] ${m.text}`,
        snippet: m.text,
        id: m.id,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// SLIDE COMMENTS
// ---------------------------------------------------------------------------
async function getSlideComments(brandId: string, blockId: number): Promise<SlideComment[]> {
  const { data, error } = await supabase
    .from('sb_slide_comments')
    .select('*')
    .eq('brand_id', brandId)
    .eq('block_id', blockId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[db] getSlideComments:', error);
    return [];
  }
  return data as SlideComment[];
}

async function createSlideComment(input: {
  brand_id: string;
  block_id: number;
  author_name: string;
  comment_text: string;
}): Promise<SlideComment> {
  const { data, error } = await supabase
    .from('sb_slide_comments')
    .insert(input)
    .select()
    .single();
  if (error) {
    console.error('[db] createSlideComment:', error);
    throw error;
  }
  return data as SlideComment;
}

async function deleteSlideComment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('sb_slide_comments')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[db] deleteSlideComment:', error);
    return false;
  }
  return true;
}

async function updateSlideComment(id: string, text: string): Promise<SlideComment | undefined> {
  const { data, error } = await supabase
    .from('sb_slide_comments')
    .update({ comment_text: text })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[db] updateSlideComment:', error);
    return undefined;
  }
  return data as SlideComment;
}

// ---------------------------------------------------------------------------
// Exported db object — same interface as the old localStorage layer
// ---------------------------------------------------------------------------
export const db = {
  // Auth
  getCurrentUser,
  loginWithGoogle,
  logout,
  isAuthenticated,
  getMembers,
  updateMemberPermissions,
  getActivityLogs,
  createActivityLog,
  // Brands
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  // Brand Blocks
  getBrandBlocks,
  updateBrandBlock,
  // Markers
  getMarkers,
  createMarker,
  resolveMarker,
  deleteMarker,
  syncMarkersFromContent,
  // Naming Candidates
  getNamingCandidates,
  createNamingCandidate,
  updateNamingCandidate,
  deleteNamingCandidate,
  // Knowledge Items
  getKnowledgeItems,
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  // Rules
  getRules,
  createRule,
  updateRule,
  deleteRule,
  // Agent Runs
  getAgentRuns,
  createAgentRun,
  // Share Links
  getShareLinks,
  createShareLink,
  deactivateShareLink,
  // Search
  searchGlobal,
  // Slide Comments
  getSlideComments,
  createSlideComment,
  deleteSlideComment,
  updateSlideComment,
};

export type { SearchResult };
