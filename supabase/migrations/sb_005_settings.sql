-- ============================================================
-- iARTESANA Sistema Base — sb_settings Table
-- Stores global configuration settings shared across all members.
-- ============================================================

CREATE TABLE IF NOT EXISTS sb_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE sb_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "sb_settings_read" ON sb_settings
  FOR SELECT TO authenticated USING (true);

-- Allow only admin members to insert/update settings
CREATE POLICY "sb_settings_admin" ON sb_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sb_members
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sb_members
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default empty gemini_api_key
INSERT INTO sb_settings (key, value)
VALUES ('gemini_api_key', '')
ON CONFLICT (key) DO NOTHING;
