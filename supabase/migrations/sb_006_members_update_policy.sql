-- ============================================================
-- iARTESANA Sistema Base — Update RLS policy for sb_members
-- Allows users to update their own profiles and admins to manage all members.
-- ============================================================

DROP POLICY IF EXISTS "sb_members_update" ON sb_members;

CREATE POLICY "sb_members_update" ON sb_members
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid() OR
    (SELECT role FROM sb_members WHERE auth_user_id = auth.uid()) = 'admin'
  );
