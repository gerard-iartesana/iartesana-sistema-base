-- ============================================================
-- iARTESANA Sistema Base — Rename block 13
-- Changes "Implicaciones Directas para Agentes de IA" to "Instrucciones específicas"
-- and clears its description.
-- ============================================================

UPDATE sb_block_definitions
SET title = 'Instrucciones específicas',
    description = ''
WHERE id = 13;
