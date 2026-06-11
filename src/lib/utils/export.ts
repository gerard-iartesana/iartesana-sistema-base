import { BLOCK_DEFINITIONS, getBlockById } from '@/lib/data/block-definitions';
import type { Brand, BrandBlock, Marker } from '@/lib/db/types';

/**
 * Exports the full markdown document for a brand, mimicking the Menorca MPC example format.
 */
export function exportFullMarkdown(brand: Brand, blocks: BrandBlock[], markers: Marker[]): string {
  const lines: string[] = [];

  lines.push(`# ${brand.name} — Sistema Base`);
  lines.push('');
  lines.push(`> **Versión:** ${brand.doc_version}`);
  lines.push(`> **Estado:** ${brand.status}`);
  lines.push(`> **Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  const stageLabels: Record<string, string> = {
    A: 'Etapa A — Esencia y Alma',
    B: 'Etapa B — Personalidad y Voz',
    C: 'Etapa C — Operaciones y Públicos',
    D: 'Etapa D — Gobierno y Salvaguardas',
  };

  let currentStage = '';

  for (const def of BLOCK_DEFINITIONS) {
    if (def.stage !== currentStage) {
      currentStage = def.stage;
      lines.push(`## ${stageLabels[currentStage]}`);
      lines.push('');
    }

    const block = blocks.find(b => b.block_id === def.id);
    const statusLabel = block?.status || 'vacío';

    lines.push(`### ${def.id}. ${def.title}`);
    lines.push(`*Estado: ${statusLabel}*`);
    lines.push('');

    if (block?.content_md?.trim()) {
      lines.push(block.content_md.trim());
    } else {
      lines.push('*Sin contenido*');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Markers table
  const unresolvedMarkers = markers.filter(m => !m.resolved);
  if (unresolvedMarkers.length > 0) {
    lines.push('## Tabla de Huecos Abiertos');
    lines.push('');
    lines.push('| Tipo | Bloque | Texto |');
    lines.push('|------|--------|-------|');
    for (const m of unresolvedMarkers) {
      const blockDef = getBlockById(m.block_id);
      const blockLabel = blockDef ? `${blockDef.id}. ${blockDef.title}` : `Bloque ${m.block_id}`;
      lines.push(`| ${m.type} | ${blockLabel} | ${m.text} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exports the Prompt Global: a compiled system prompt from all blocks.
 * Excludes content marked with [pendiente: ...].
 * Ensures block 13 (IA instructions) is always last.
 */
export function exportPromptGlobal(brand: Brand, blocks: BrandBlock[]): string {
  const lines: string[] = [];

  lines.push(`# Contexto de Marca: ${brand.name}`);
  lines.push('');
  lines.push('Eres un agente de IA al servicio de esta marca. A continuación tienes el contexto completo que define su identidad, voz, operaciones y reglas. Actúa siempre dentro de estos límites.');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Order: 1-12 first, then 13 last
  const orderedDefs = [...BLOCK_DEFINITIONS.filter(d => d.id !== 13), ...BLOCK_DEFINITIONS.filter(d => d.id === 13)];

  for (const def of orderedDefs) {
    const block = blocks.find(b => b.block_id === def.id);
    if (!block?.content_md?.trim()) continue;

    // Remove [pendiente: ...] markers from content
    const cleaned = block.content_md.replace(/\[pendiente:\s*[^\]]*\]/gi, '').trim();
    if (!cleaned) continue;

    lines.push(`## ${def.title}`);
    lines.push('');
    lines.push(cleaned);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Returns info about what's included/excluded in the prompt global.
 */
export function getPromptGlobalInfo(blocks: BrandBlock[], markers: Marker[]): {
  includedBlocks: number[];
  excludedBlocks: number[];
  pendienteCount: number;
} {
  const includedBlocks: number[] = [];
  const excludedBlocks: number[] = [];

  for (const def of BLOCK_DEFINITIONS) {
    const block = blocks.find(b => b.block_id === def.id);
    if (block?.content_md?.trim()) {
      includedBlocks.push(def.id);
    } else {
      excludedBlocks.push(def.id);
    }
  }

  const pendienteCount = markers.filter(m => m.type === 'pendiente' && !m.resolved).length;

  return { includedBlocks, excludedBlocks, pendienteCount };
}

/**
 * Converts markdown string into simple HTML formatting suitable for copy-paste into rich-text processors (Word, Docs).
 */
export function convertMarkdownToHtmlForClipboard(markdown: string): string {
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Headers
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    
    // Paragraphs
    .split('\n\n')
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li>') || trimmed.startsWith('<hr')) {
        return trimmed;
      }
      if (trimmed.includes('<li>')) {
        return `<ul>${trimmed}</ul>`;
      }
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('\n');
    
  return `<html><body>${html}</body></html>`;
}
