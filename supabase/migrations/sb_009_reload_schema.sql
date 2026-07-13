-- ============================================================
-- iARTESANA Sistema Base — Reload PostgREST schema cache
-- Triggers PostgREST to reload the table structures from PostgreSQL.
-- ============================================================

NOTIFY pgrst, 'reload schema';
