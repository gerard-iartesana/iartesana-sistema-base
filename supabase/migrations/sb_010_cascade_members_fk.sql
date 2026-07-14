-- ============================================================
-- iARTESANA Base — Alter member FK constraints to ON DELETE SET NULL
-- Prevents foreign key constraint violations when deleting users.
-- ============================================================

-- 1. Alter sb_brand_blocks updated_by constraint
ALTER TABLE sb_brand_blocks
  DROP CONSTRAINT IF EXISTS sb_brand_blocks_updated_by_fkey,
  ADD CONSTRAINT sb_brand_blocks_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES sb_members(id) ON DELETE SET NULL;

-- 2. Alter sb_agent_runs created_by constraint
ALTER TABLE sb_agent_runs
  DROP CONSTRAINT IF EXISTS sb_agent_runs_created_by_fkey,
  ADD CONSTRAINT sb_agent_runs_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES sb_members(id) ON DELETE SET NULL;
