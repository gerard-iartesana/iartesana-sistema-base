-- ============================================================
-- iARTESANA Sistema Base — Public SELECT Policies
-- Enable anonymous visitors (role: anon) to read shared brands
-- and their associated brand blocks, markers, and rules safely.
-- ============================================================

-- 1. Allow anon users to read brand details if there is an active share link
CREATE POLICY "sb_brands_public" ON sb_brands
  FOR SELECT TO anon
  USING (id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 2. Allow anon users to read block definitions (static metadata)
CREATE POLICY "sb_block_defs_public" ON sb_block_definitions
  FOR SELECT TO anon
  USING (true);

-- 3. Allow anon users to read brand blocks if there is an active share link
CREATE POLICY "sb_brand_blocks_public" ON sb_brand_blocks
  FOR SELECT TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 4. Allow anon users to read markers if there is an active share link
CREATE POLICY "sb_markers_public" ON sb_markers
  FOR SELECT TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 5. Allow anon users to read naming candidates if there is an active share link
CREATE POLICY "sb_naming_public" ON sb_naming_candidates
  FOR SELECT TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 6. Allow anon users to read knowledge items if there is an active share link
CREATE POLICY "sb_knowledge_public" ON sb_knowledge_items
  FOR SELECT TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));

-- 7. Allow anon users to read rules if there is an active share link
CREATE POLICY "sb_rules_public" ON sb_rules
  FOR SELECT TO anon
  USING (brand_id IN (
    SELECT brand_id 
    FROM sb_share_links 
    WHERE active = true
  ));
