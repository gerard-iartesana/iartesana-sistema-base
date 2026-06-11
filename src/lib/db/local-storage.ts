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
  BlockStatus,
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

  if (member) return member as Member;

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
  return newMember as Member;
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
  const { data, error } = await supabase
    .from('sb_brands')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[db] getBrands:', error); return []; }
  return data as Brand[];
}

async function getBrand(id: string): Promise<Brand | undefined> {
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
  // Trigger auto-creates 13 brand_blocks in DB
  return data as Brand;
}

async function updateBrand(
  id: string,
  data: Partial<Omit<Brand, 'id' | 'created_at' | 'created_by'>>
): Promise<Brand | undefined> {
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
  return updated as Brand;
}

async function deleteBrand(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('sb_brands')
    .delete()
    .eq('id', id);
  if (error) { console.error('[db] deleteBrand:', error); return false; }
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
  return data as BrandBlock[];
}

async function updateBrandBlock(
  brandId: string,
  blockId: number,
  input: Partial<Pick<BrandBlock, 'content_md' | 'status' | 'updated_by'>>
): Promise<BrandBlock | undefined> {
  const memberId = await getMemberId();
  const updateData: Record<string, unknown> = { ...input };
  if (memberId) {
    updateData.updated_by = memberId;
  }

  const { data, error } = await supabase
    .from('sb_brand_blocks')
    .update(updateData)
    .eq('brand_id', brandId)
    .eq('block_id', blockId)
    .select()
    .single();
  if (error) {
    console.error('[db] updateBrandBlock:', error, { brandId, blockId, updateData });
    return undefined;
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
  const { data, error } = await supabase
    .from('sb_markers')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Marker;
}

async function resolveMarker(id: string): Promise<Marker | undefined> {
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
  const { error } = await supabase.from('sb_markers').delete().eq('id', id);
  return !error;
}

async function syncMarkersFromContent(
  brandId: string,
  blockId: number,
  content: string
): Promise<void> {
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
  const { data, error } = await supabase
    .from('sb_naming_candidates')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as NamingCandidate;
}

async function updateNamingCandidate(
  id: string,
  input: Partial<Omit<NamingCandidate, 'id' | 'brand_id' | 'created_at'>>
): Promise<NamingCandidate | undefined> {
  const { data, error } = await supabase
    .from('sb_naming_candidates')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) return undefined;
  return data as NamingCandidate;
}

async function deleteNamingCandidate(id: string): Promise<boolean> {
  const { error } = await supabase.from('sb_naming_candidates').delete().eq('id', id);
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
  const { data, error } = await supabase
    .from('sb_knowledge_items')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as KnowledgeItem;
}

async function updateKnowledgeItem(
  id: string,
  input: Partial<Omit<KnowledgeItem, 'id' | 'brand_id' | 'created_at'>>
): Promise<KnowledgeItem | undefined> {
  const { data, error } = await supabase
    .from('sb_knowledge_items')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) return undefined;
  return data as KnowledgeItem;
}

async function deleteKnowledgeItem(id: string): Promise<boolean> {
  const { error } = await supabase.from('sb_knowledge_items').delete().eq('id', id);
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
    .insert(input)
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
// Exported db object — same interface as the old localStorage layer
// ---------------------------------------------------------------------------
export const db = {
  // Auth
  getCurrentUser,
  loginWithGoogle,
  logout,
  isAuthenticated,
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
};

export type { SearchResult };
