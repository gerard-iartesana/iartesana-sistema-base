export interface NamingParameter {
  name: string;
  score: number;
  text: string;
}

export interface NamingAnalysis {
  overallScore: number;
  pros: string[];
  contras: string[];
  claims: string[];
  parameters: NamingParameter[];
}

export function splitNamingRationale(rationale: string): { userRationale: string; analysis: NamingAnalysis | null } {
  const cleanRationale = rationale || '';
  const match = cleanRationale.match(/<!-- NAMING_ANALYSIS:\s*(\{[\s\S]+?\})\s*-->/);
  let analysis: NamingAnalysis | null = null;
  if (match) {
    try {
      analysis = JSON.parse(match[1]);
    } catch (e) {
      console.error('Error parsing naming analysis JSON:', e);
    }
  }

  let userRationale = cleanRationale;
  userRationale = userRationale.replace(/\s*<!-- NAMING_ANALYSIS:[\s\S]+?-->/g, '').trim();

  return {
    userRationale,
    analysis
  };
}

export function compileNamingRationale(userRationale: string, analysis: NamingAnalysis | null): string {
  const base = (userRationale || '').trim();
  if (!analysis) return base;
  return `${base}\n\n<!-- NAMING_ANALYSIS:${JSON.stringify(analysis)} -->`.trim();
}

export function splitBlock3Content(md: string): string {
  let cleanMd = md || '';
  // Remove the generated candidates table section
  cleanMd = cleanMd.replace(/\s*\n*### Tabla de Candidatos de Naming[\s\S]*$/g, '').trim();
  return cleanMd;
}

export interface MinimalNamingCandidate {
  name: string;
  rationale_md: string;
  status: 'candidato' | 'descartado' | 'elegido';
  veto_reason: string | null;
}

export function compileBlock3Content(rawMarkdown: string, candidates: MinimalNamingCandidate[]): string {
  let md = (rawMarkdown || '').trim();
  if (candidates.length === 0) return md;

  // Sort candidates: Chosen (elegido) first, then Candidate (candidato) sorted by score/name, then Discarded (descartado)
  const sortedCandidates = [...candidates].sort((a, b) => {
    const statusOrder = { elegido: 1, candidato: 2, descartado: 3 };
    const priorityA = statusOrder[a.status] ?? 99;
    const priorityB = statusOrder[b.status] ?? 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Sort within status by AI overallScore descending
    const { analysis: analysisA } = splitNamingRationale(a.rationale_md);
    const { analysis: analysisB } = splitNamingRationale(b.rationale_md);
    const scoreA = analysisA?.overallScore ?? 0;
    const scoreB = analysisB?.overallScore ?? 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Secondary fallback: alphabetical
    return a.name.localeCompare(b.name);
  });

  let tableMd = `\n\n### Tabla de Candidatos de Naming\n\n`;
  tableMd += `| Nombre | Estado | Notas / Razón de Veto |\n`;
  tableMd += `|---|---|---|\n`;

  for (const c of sortedCandidates) {
    const { userRationale, analysis } = splitNamingRationale(c.rationale_md);
    
    let notes = userRationale || '—';
    if (c.status === 'descartado' && c.veto_reason) {
      notes += ` (Veto: ${c.veto_reason})`;
    }
    if (analysis) {
      notes += ` (IA: ${analysis.overallScore}/100)`;
    }

    const statusLabel = c.status === 'elegido' ? '⭐ Elegido' : c.status === 'descartado' ? '❌ Descartado' : 'Candidato';
    tableMd += `| **${c.name}** | ${statusLabel} | ${notes} |\n`;
  }

  return `${md}${tableMd}`.trim();
}
