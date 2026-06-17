export interface AnalysisParameter {
  id: number;
  name: string;
  score: number;
  text: string;
}

export interface AnalysisReport {
  overallScore: number;
  conclusion: string;
  parameters: AnalysisParameter[];
}

export interface SavedMockups {
  card?: string;
  mobile?: string;
  letter?: string;
  tshirt?: string;
  tote?: string;
}

export interface BrandVariant {
  id: string;
  name: string;
  base64: string;
}

export interface Block7Content {
  rawMarkdown: string;
  colors: string[];
  analysis: AnalysisReport | null;
  mockups: SavedMockups;
  variants: BrandVariant[];
}

export const CATEGORY_MAP: Record<string, keyof SavedMockups> = {
  'Tarjeta': 'card',
  'Movil': 'mobile',
  'Papel A4': 'letter',
  'Camiseta': 'tshirt',
  'Bolso Tote': 'tote'
};

export const REVERSE_CATEGORY_MAP: Record<keyof SavedMockups, string> = {
  card: 'Tarjeta',
  mobile: 'Movil',
  letter: 'Papel A4',
  tshirt: 'Camiseta',
  tote: 'Bolso Tote'
};

export function parseSavedColors(md: string): string[] {
  const match = md.match(/<!-- LOGO_COLORS:\s*(\[[\s\S]+?\])\s*-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Error parsing saved logo colors JSON:', e);
    }
  }
  return [];
}

export function parseSavedAnalysis(md: string): AnalysisReport | null {
  const match = md.match(/<!-- LOGO_ANALYSIS_JSON:\s*(\{[\s\S]+?\})\s*-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Error parsing saved logo analysis JSON:', e);
    }
  }
  return null;
}

export function parseSavedMockups(md: string): SavedMockups {
  const mockups: SavedMockups = {};
  const regex = /!\[Mockup (Tarjeta|Movil|Papel A4|Camiseta|Bolso Tote)\]\((data:image\/[^)]+)\)/g;
  let match;
  while ((match = regex.exec(md)) !== null) {
    const label = match[1];
    const base64 = match[2];
    const key = CATEGORY_MAP[label];
    if (key) {
      mockups[key] = base64;
    }
  }
  return mockups;
}

export function parseSavedVariants(md: string): BrandVariant[] {
  const match = md.match(/<!-- LOGO_VARIANTS:\s*(\[[\s\S]+?\])\s*-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Error parsing saved logo variants JSON:', e);
    }
  }
  return [];
}

export function splitBlock7Content(md: string): Block7Content {
  const colors = parseSavedColors(md);
  const analysis = parseSavedAnalysis(md);
  const mockups = parseSavedMockups(md);
  const variants = parseSavedVariants(md);

  let rawMarkdown = md;
  // 1. Remove mockups
  rawMarkdown = rawMarkdown.replace(/\s*\n*!\[Mockup (Tarjeta|Movil|Papel A4|Camiseta|Bolso Tote)\]\(data:image\/[^)]+\)/g, '').trim();

  // 2. Remove comments
  rawMarkdown = rawMarkdown.replace(/\s*\n*<!-- LOGO_COLORS:[\s\S]+?-->/g, '').trim();
  rawMarkdown = rawMarkdown.replace(/\s*\n*<!-- LOGO_ANALYSIS_JSON:[\s\S]+?-->/g, '').trim();
  rawMarkdown = rawMarkdown.replace(/\s*\n*<!-- LOGO_VARIANTS:[\s\S]+?-->/g, '').trim();

  // 3. Remove human-readable auditoría section if it exists
  rawMarkdown = rawMarkdown.replace(/\s*\n*### Auditoría de Rendimiento del Logotipo[\s\S]*$/g, '').trim();

  return {
    rawMarkdown,
    colors,
    analysis,
    mockups,
    variants
  };
}

export function compileBlock7Content(data: Block7Content): string {
  let md = data.rawMarkdown.trim();

  // 1. Append analysis
  if (data.analysis) {
    let analysisMd = `\n\n### Auditoría de Rendimiento del Logotipo (15 Parámetros)\n\n`;
    analysisMd += `Valoración Global: **${data.analysis.overallScore}/100**\n\n`;
    analysisMd += `| Parámetro | Valoración | Explicación |\n`;
    analysisMd += `|---|---|---|\n`;
    for (const p of data.analysis.parameters) {
      analysisMd += `| ${p.id}. ${p.name} | **${p.score}/10** | ${p.text} |\n`;
    }
    analysisMd += `\n**Conclusión General:** ${data.analysis.conclusion}\n\n`;
    
    const jsonComment = `<!-- LOGO_ANALYSIS_JSON:${JSON.stringify(data.analysis)} -->`;
    md = `${md}\n${analysisMd}${jsonComment}`.trim();
  }

  // 2. Append colors
  if (data.colors && data.colors.length > 0) {
    const colorsComment = `<!-- LOGO_COLORS:${JSON.stringify(data.colors)} -->`;
    md = `${md}\n\n${colorsComment}`.trim();
  }

  // 3. Append variants
  if (data.variants && data.variants.length > 0) {
    const variantsComment = `<!-- LOGO_VARIANTS:${JSON.stringify(data.variants)} -->`;
    md = `${md}\n\n${variantsComment}`.trim();
  }

  // 4. Append mockups
  const mockupLines: string[] = [];
  Object.entries(data.mockups).forEach(([key, base64]) => {
    if (base64) {
      const label = REVERSE_CATEGORY_MAP[key as keyof SavedMockups];
      mockupLines.push(`![Mockup ${label}](${base64})`);
    }
  });

  if (mockupLines.length > 0) {
    md = `${md}\n\n${mockupLines.join('\n\n')}`.trim();
  }

  return md;
}
