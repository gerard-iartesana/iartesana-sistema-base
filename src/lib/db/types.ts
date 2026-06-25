// iARTESANA Sistema Base — Data Types
// Mirrors the schema `sistema_base` from the spec

export type MemberRole = 'admin' | 'editor';

export interface Member {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
  created_at: string;
  avatar_url?: string | null;
}

export type BrandStatus = 'activo' | 'pausado' | 'archivado';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  status: BrandStatus;
  doc_version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type Stage = 'A' | 'B' | 'C' | 'D' | 'E';

export interface BlockDefinition {
  id: number;
  stage: Stage;
  title: string;
  description: string;
  sort: number;
}

export type BlockStatus = 'vacio' | 'borrador' | 'en_revision' | 'validado';

export interface BrandBlock {
  id: string;
  brand_id: string;
  block_id: number;
  content_md: string;
  status: BlockStatus;
  updated_by: string | null;
  updated_at: string;
}

export type MarkerType = 'pendiente' | 'verificar';

export interface Marker {
  id: string;
  brand_id: string;
  block_id: number;
  type: MarkerType;
  text: string;
  blocks_what: string | null;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
}

export type NamingStatus = 'candidato' | 'descartado' | 'elegido';

export interface NamingCandidate {
  id: string;
  brand_id: string;
  name: string;
  rationale_md: string;
  status: NamingStatus;
  veto_reason: string | null;
  created_at: string;
}

export type KnowledgeKind = 'recomendacion' | 'faq' | 'politica' | 'normativa';

export interface KnowledgeItem {
  id: string;
  brand_id: string;
  kind: KnowledgeKind;
  title: string;
  body_md: string;
  audience: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export type RuleKind = 'linea_roja' | 'protocolo_incidencia' | 'instruccion_ia';

export interface Rule {
  id: string;
  brand_id: string;
  kind: RuleKind;
  body_md: string;
  sort: number;
}

export type AgentName = 'historiador' | 'linguista' | 'estratega' | 'auditor';
export type AgentRunStatus = 'running' | 'done' | 'error';

export interface AgentRun {
  id: string;
  brand_id: string;
  block_id: number;
  agent: AgentName;
  input_text: string;
  output_md: string;
  status: AgentRunStatus;
  created_by: string;
  created_at: string;
}

export type ShareMode = 'lectura' | 'presentacion';

export interface ShareLink {
  id: string;
  brand_id: string;
  password_hash: string;
  mode: ShareMode;
  active: boolean;
  created_at: string;
}

export interface SlideComment {
  id: string;
  brand_id: string;
  block_id: number;
  author_name: string;
  comment_text: string;
  created_at: string;
}
