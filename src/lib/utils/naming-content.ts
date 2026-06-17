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
