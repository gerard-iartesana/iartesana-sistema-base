-- ============================================================
-- iARTESANA Sistema Base — Migración inicial
-- Tablas con prefijo sb_ en schema public (convive con app interna)
-- ============================================================

-- 1. Miembros del equipo (vinculados a auth.users)
CREATE TABLE IF NOT EXISTS sb_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Marcas
CREATE TABLE IF NOT EXISTS sb_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_path TEXT,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'pausado', 'archivado')),
  doc_version TEXT NOT NULL DEFAULT '0.1.0',
  created_by UUID REFERENCES sb_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Definiciones de bloques (seed estático)
CREATE TABLE IF NOT EXISTS sb_block_definitions (
  id INT PRIMARY KEY,
  stage CHAR(1) NOT NULL CHECK (stage IN ('A', 'B', 'C', 'D')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort INT NOT NULL DEFAULT 0
);

-- 4. Bloques de marca (contenido editable)
CREATE TABLE IF NOT EXISTS sb_brand_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  block_id INT NOT NULL REFERENCES sb_block_definitions(id),
  content_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'vacio' CHECK (status IN ('vacio', 'borrador', 'en_revision', 'validado')),
  updated_by UUID REFERENCES sb_members(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, block_id)
);

-- 5. Marcadores extraídos del contenido
CREATE TABLE IF NOT EXISTS sb_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  block_id INT NOT NULL REFERENCES sb_block_definitions(id),
  type TEXT NOT NULL CHECK (type IN ('pendiente', 'verificar')),
  text TEXT NOT NULL,
  blocks_what TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 6. Candidatos de naming
CREATE TABLE IF NOT EXISTS sb_naming_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rationale_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'candidato' CHECK (status IN ('candidato', 'descartado', 'elegido')),
  veto_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Biblioteca de conocimiento operativo
CREATE TABLE IF NOT EXISTS sb_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('recomendacion', 'faq', 'politica', 'normativa')),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Reglas (líneas rojas, protocolos, instrucciones IA)
CREATE TABLE IF NOT EXISTS sb_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('linea_roja', 'protocolo_incidencia', 'instruccion_ia')),
  body_md TEXT NOT NULL DEFAULT '',
  sort INT NOT NULL DEFAULT 0
);

-- 9. Ejecuciones de agentes IA
CREATE TABLE IF NOT EXISTS sb_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  block_id INT REFERENCES sb_block_definitions(id),
  agent TEXT NOT NULL CHECK (agent IN ('historiador', 'linguista', 'estratega', 'auditor')),
  input_text TEXT NOT NULL DEFAULT '',
  output_md TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'error')),
  created_by UUID REFERENCES sb_members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Enlaces compartidos
CREATE TABLE IF NOT EXISTS sb_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'lectura' CHECK (mode IN ('lectura', 'presentacion')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SEED: block_definitions (13 bloques)
-- ============================================================
INSERT INTO sb_block_definitions (id, stage, title, description, sort) VALUES
  (1, 'A', 'Historia Narrativa', 'Trayectoria real del fundador, decisiones críticas, escala humana del negocio.', 1),
  (2, 'A', 'Propuesta de Valor Diferencial', 'Qué se perdería el cliente si la marca no existiera. Misión, visión y valores auténticos.', 2),
  (3, 'A', 'Laboratorio de Naming', 'Candidatos con análisis de significado, sonoridad y viabilidad internacional.', 3),
  (4, 'B', 'Matriz de Arquetipos', 'Arquetipo primario y secundario con descripción aplicada.', 4),
  (5, 'B', 'Tensión y Equilibrio de Voz', 'El balance que define la voz. Registros falsos a evitar.', 5),
  (6, 'B', 'Identidad Verbal y Glosario', 'Reglas de tuteo por mercado, palabras prohibidas, vocabulario nativo, tagline.', 6),
  (7, 'B', 'Conceptualización Visual', 'Tipografía, paleta, formas y líneas, versatilidad a una tinta.', 7),
  (8, 'C', 'Segmentación No-Demográfica', 'Fichas de cliente ideal por comportamiento/valores. Perfiles excluidos.', 8),
  (9, 'C', 'Relación B2B / Aliados y Propietarios', 'Promesa central a socios/propietarios. Barreras infranqueables.', 9),
  (10, 'C', 'Biblioteca de Conocimiento Operativo', 'Recomendaciones, FAQs, normativas, políticas diferenciales.', 10),
  (11, 'D', 'Líneas Rojas', 'Qué nunca hacemos: lista estricta de límites infranqueables.', 11),
  (12, 'D', 'Protocolos de Incidencias', 'Cuando algo va mal: listón de atención, flujos de escalado.', 12),
  (13, 'D', 'Implicaciones Directas para Agentes de IA', 'Instrucciones imperativas derivadas de todo lo anterior.', 13)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE sb_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_block_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_brand_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_naming_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sb_share_links ENABLE ROW LEVEL SECURITY;

-- Block definitions: readable by all authenticated users
CREATE POLICY "sb_block_defs_read" ON sb_block_definitions
  FOR SELECT TO authenticated USING (true);

-- Members: users can read all members, insert/update their own
CREATE POLICY "sb_members_read" ON sb_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sb_members_insert" ON sb_members
  FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "sb_members_update" ON sb_members
  FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

-- Brands: all authenticated members can CRUD
CREATE POLICY "sb_brands_all" ON sb_brands
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Brand blocks: all authenticated can CRUD
CREATE POLICY "sb_brand_blocks_all" ON sb_brand_blocks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Markers: all authenticated can CRUD
CREATE POLICY "sb_markers_all" ON sb_markers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Naming: all authenticated can CRUD
CREATE POLICY "sb_naming_all" ON sb_naming_candidates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Knowledge: all authenticated can CRUD
CREATE POLICY "sb_knowledge_all" ON sb_knowledge_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Rules: all authenticated can CRUD
CREATE POLICY "sb_rules_all" ON sb_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Agent runs: all authenticated can CRUD
CREATE POLICY "sb_agent_runs_all" ON sb_agent_runs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Share links: all authenticated can CRUD; anon can SELECT active links
CREATE POLICY "sb_share_links_auth" ON sb_share_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sb_share_links_public" ON sb_share_links
  FOR SELECT TO anon USING (active = true);

-- ============================================================
-- Function: auto-create 13 empty brand blocks on brand insert
-- ============================================================
CREATE OR REPLACE FUNCTION sb_auto_create_blocks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sb_brand_blocks (brand_id, block_id, content_md, status, updated_at)
  SELECT NEW.id, id, '', 'vacio', now()
  FROM sb_block_definitions;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sb_brand_after_insert
  AFTER INSERT ON sb_brands
  FOR EACH ROW EXECUTE FUNCTION sb_auto_create_blocks();

-- ============================================================
-- Function: auto-update updated_at on brand_blocks
-- ============================================================
CREATE OR REPLACE FUNCTION sb_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sb_brand_blocks_updated
  BEFORE UPDATE ON sb_brand_blocks
  FOR EACH ROW EXECUTE FUNCTION sb_update_timestamp();

CREATE TRIGGER sb_brands_updated
  BEFORE UPDATE ON sb_brands
  FOR EACH ROW EXECUTE FUNCTION sb_update_timestamp();

CREATE TRIGGER sb_knowledge_updated
  BEFORE UPDATE ON sb_knowledge_items
  FOR EACH ROW EXECUTE FUNCTION sb_update_timestamp();
