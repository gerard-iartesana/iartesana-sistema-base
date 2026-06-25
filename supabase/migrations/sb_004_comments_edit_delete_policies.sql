-- ============================================================
-- iARTESANA Sistema Base — Migración 004
-- Políticas RLS adicionales para edición y borrado de comentarios
-- Prefijo sb_ en schema public
-- ============================================================

-- 1. Actualización (UPDATE)
-- Miembros autenticados: pueden editar cualquier comentario
CREATE POLICY "sb_slide_comments_update_auth" ON sb_slide_comments
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Visitantes anónimos: pueden editar comentarios si la marca tiene un enlace compartido activo
CREATE POLICY "sb_slide_comments_update_public" ON sb_slide_comments
  FOR UPDATE TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ))
  WITH CHECK (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 2. Borrado (DELETE)
-- Visitantes anónimos: pueden borrar comentarios si la marca tiene un enlace compartido activo
-- (La política para usuarios autenticados ya existe como "sb_slide_comments_delete_auth")
CREATE POLICY "sb_slide_comments_delete_public" ON sb_slide_comments
  FOR DELETE TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));
