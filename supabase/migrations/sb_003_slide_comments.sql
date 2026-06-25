-- ============================================================
-- iARTESANA Sistema Base — Migración 003
-- Tabla de comentarios/anotaciones para diapositivas
-- Prefijo sb_ en schema public
-- ============================================================

CREATE TABLE IF NOT EXISTS sb_slide_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES sb_brands(id) ON DELETE CASCADE,
  block_id INT NOT NULL REFERENCES sb_block_definitions(id),
  author_name TEXT NOT NULL DEFAULT 'Cliente',
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE sb_slide_comments ENABLE ROW LEVEL SECURITY;

-- 1. Lectura: Miembros autenticados o visitantes anónimos si la marca tiene un enlace compartido activo
CREATE POLICY "sb_slide_comments_read_auth" ON sb_slide_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sb_slide_comments_read_public" ON sb_slide_comments
  FOR SELECT TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 2. Escritura: Miembros autenticados o visitantes anónimos si la marca tiene un enlace compartido activo
CREATE POLICY "sb_slide_comments_insert_auth" ON sb_slide_comments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sb_slide_comments_insert_public" ON sb_slide_comments
  FOR INSERT TO anon
  WITH CHECK (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 3. Borrado: Únicamente miembros autenticados
CREATE POLICY "sb_slide_comments_delete_auth" ON sb_slide_comments
  FOR DELETE TO authenticated USING (true);
