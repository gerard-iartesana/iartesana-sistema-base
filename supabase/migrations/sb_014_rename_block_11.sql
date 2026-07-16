-- ============================================================
-- iARTESANA Sistema Base — Rename block 11
-- Changes "Líneas Rojas" to "Líneas rojas específicas".
-- ============================================================

UPDATE sb_block_definitions
SET title = 'Líneas rojas específicas'
WHERE id = 11;
