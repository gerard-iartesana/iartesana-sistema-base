import type { BlockDefinition, Stage } from '@/lib/db/types';

export const STAGES: { key: Stage; label: string; color: string; bgColor: string; borderColor: string }[] = [
  { key: 'A', label: 'Esencia y Alma', color: '#7361a8', bgColor: 'bg-violet-50', borderColor: 'border-violet-300' },
  { key: 'B', label: 'Personalidad y Voz', color: '#e3599c', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' },
  { key: 'C', label: 'Operaciones y Públicos', color: '#36a8e0', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300' },
  { key: 'D', label: 'Gobierno y Salvaguardas', color: '#85bf57', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' },
];

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  { id: 1, stage: 'A', title: 'Historia Narrativa', description: 'Trayectoria real del fundador, decisiones críticas, escala humana del negocio.', sort: 1 },
  { id: 2, stage: 'A', title: 'Propuesta de Valor Diferencial', description: 'Qué se perdería el cliente si la marca no existiera; misión, visión, valores.', sort: 2 },
  { id: 3, stage: 'A', title: 'Laboratorio de Naming', description: 'Candidatos con significado/sonoridad/viabilidad internacional + registro de vetos con su porqué.', sort: 3 },
  { id: 4, stage: 'B', title: 'Matriz de Arquetipos', description: 'Mapeo interactivo sobre la rueda de arquetipos, identificando los perfiles primario y secundario con sus roles reales y descripción aplicada.', sort: 4 },
  { id: 5, stage: 'B', title: 'Tensión y Equilibrio de Voz', description: 'El balance que define la voz (ej. "cercanía CON profesionalidad"), registros falsos a evitar.', sort: 5 },
  { id: 6, stage: 'B', title: 'Identidad Verbal y Glosario', description: 'Reglas de tuteo por mercado, palabras prohibidas del sector, vocabulario nativo, tagline.', sort: 6 },
  { id: 7, stage: 'B', title: 'Identidad Visual', description: 'Tipografía, paleta (con hex/Pantone), formas y líneas, versatilidad a una tinta.', sort: 7 },
  { id: 8, stage: 'C', title: 'Segmentación No-Demográfica', description: 'Fichas de cliente ideal por comportamiento/valores + perfiles excluidos explícitos.', sort: 8 },
  { id: 9, stage: 'C', title: 'Relación B2B / Aliados y Propietarios', description: 'Promesa central a socios/propietarios, barreras infranqueables de gestión.', sort: 9 },
  { id: 10, stage: 'C', title: 'Biblioteca de Conocimiento Operativo', description: 'Recomendaciones no incentivadas, FAQs críticas, normativas, políticas diferenciales.', sort: 10 },
  { id: 11, stage: 'D', title: 'Líneas rojas específicas', description: '', sort: 11 },
  { id: 12, stage: 'D', title: 'Ejemplos de Incidencias', description: '', sort: 12 },
  { id: 13, stage: 'D', title: 'Instrucciones específicas', description: '', sort: 13 },
];

export function getBlocksByStage(stage: Stage): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter(b => b.stage === stage);
}

export function getBlockById(id: number): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find(b => b.id === id);
}

export function getStageForBlock(blockId: number): Stage | undefined {
  if (blockId >= 101 && blockId <= 104) return 'E';
  return BLOCK_DEFINITIONS.find(b => b.id === blockId)?.stage;
}

export function getStageInfo(stage: Stage) {
  return STAGES.find(s => s.key === stage);
}
