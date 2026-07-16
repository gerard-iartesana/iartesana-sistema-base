-- ============================================================
-- iARTESANA Sistema Base — Rename block 12
-- Changes "Protocolos de Incidencias" to "Ejemplos de Incidencias".
-- ============================================================

UPDATE sb_block_definitions
SET title = 'Ejemplos de Incidencias'
WHERE id = 12;
