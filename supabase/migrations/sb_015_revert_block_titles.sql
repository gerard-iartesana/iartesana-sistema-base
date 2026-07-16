-- ============================================================
-- iARTESANA Sistema Base — Revert main block titles and descriptions
-- Restores main block definitions for blocks 11, 12, and 13.
-- ============================================================

UPDATE sb_block_definitions
SET title = 'Líneas Rojas',
    description = '"Qué nunca hacemos": lista numerada estricta.'
WHERE id = 11;

UPDATE sb_block_definitions
SET title = 'Protocolos de Incidencias',
    description = '"Cuando algo va mal": listón de atención, flujos de escalado obligatorio a humanos.'
WHERE id = 12;

UPDATE sb_block_definitions
SET title = 'Implicaciones Directas para Agentes de IA',
    description = 'Instrucciones imperativas ejecutables derivadas de todo lo anterior.'
WHERE id = 13;
