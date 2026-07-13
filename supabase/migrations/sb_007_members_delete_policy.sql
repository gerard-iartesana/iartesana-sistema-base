-- ============================================================
-- iARTESANA Sistema Base — Delete RLS policy for sb_members
-- Allows admin members to delete other members.
-- ============================================================

DROP POLICY IF EXISTS "sb_members_delete" ON sb_members;

CREATE POLICY "sb_members_delete" ON sb_members
  FOR DELETE TO authenticated
  USING (
    (SELECT role FROM sb_members WHERE auth_user_id = auth.uid()) = 'admin'
  );
