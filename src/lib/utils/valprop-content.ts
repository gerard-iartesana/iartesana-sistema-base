export interface ValueItem {
  title: string;
  text: string;
}

export interface ValuePropositionContent {
  rawMarkdown: string;
  mission: string;
  vision: string;
  values: string;
}

export function parseValueProposition(markdown: string): { mission: string; vision: string; values: string } {
  let mission = '';
  let vision = '';
  let values = '';

  const cleanMarkdown = (markdown || '').replace(/\r\n/g, '\n');

  // Matches ### Misión followed by any text until a heading starting with ### or divider --- or end of string
  const missionMatch = cleanMarkdown.match(/### Misión\n([\s\S]*?)(?=(?:###|---|$$))/i);
  if (missionMatch) {
    mission = missionMatch[1].trim();
  }

  const visionMatch = cleanMarkdown.match(/### Visión\n([\s\S]*?)(?=(?:###|---|$$))/i);
  if (visionMatch) {
    vision = visionMatch[1].trim();
  }

  const valuesMatch = cleanMarkdown.match(/### Valores\n([\s\S]*?)(?=(?:###|---|$$))/i);
  if (valuesMatch) {
    values = valuesMatch[1].trim();
  }

  return { mission, vision, values };
}

export function parseValuesList(valuesMarkdown: string): ValueItem[] {
  if (!valuesMarkdown || !valuesMarkdown.trim()) return [];
  
  const lines = valuesMarkdown.split('\n');
  const items: ValueItem[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Matches: 1. **Title**: Text
    const matchBold = trimmed.match(/^(?:\d+\.|\-|\*|\+)\s+\*\*([^*]+?)\*\*\s*[\:\-]?\s*(.*)$/);
    if (matchBold) {
      items.push({
        title: matchBold[1].trim(),
        text: matchBold[2].trim()
      });
    } else {
      // Matches standard list: 1. Title
      const matchPlain = trimmed.match(/^(?:\d+\.|\-|\*|\+)\s+(.+)$/);
      if (matchPlain) {
        items.push({
          title: matchPlain[1].trim(),
          text: ''
        });
      } else {
        items.push({
          title: trimmed,
          text: ''
        });
      }
    }
  }
  
  return items;
}

export function serializeValuesList(items: ValueItem[]): string {
  return items
    .filter(item => item.title && item.title.trim() !== '')
    .map((item, idx) => {
      const title = item.title.trim();
      const text = item.text.trim();
      if (text) {
        return `${idx + 1}. **${title}**: ${text}`;
      } else {
        return `${idx + 1}. **${title}**`;
      }
    })
    .join('\n');
}

export function splitBlock2Content(markdown: string): ValuePropositionContent {
  const parsed = parseValueProposition(markdown);
  
  let rawMarkdown = (markdown || '').replace(/\r\n/g, '\n');
  // Remove existing structured sections
  rawMarkdown = rawMarkdown.replace(/### Misión\n[\s\S]*?(?=(### Visión|### Valores|---|$))/gi, '');
  rawMarkdown = rawMarkdown.replace(/### Visión\n[\s\S]*?(?=(### Misión|### Valores|---|$))/gi, '');
  rawMarkdown = rawMarkdown.replace(/### Valores\n[\s\S]*?(?=(### Misión|### Visión|---|$))/gi, '');
  
  rawMarkdown = rawMarkdown.replace(/^---\s*\n?/gi, '').trim();

  return {
    rawMarkdown,
    ...parsed
  };
}

export function compileBlock2Content(data: ValuePropositionContent): string {
  const sections = [];
  if (data.mission.trim()) {
    sections.push(`### Misión\n${data.mission.trim()}`);
  }
  if (data.vision.trim()) {
    sections.push(`### Visión\n${data.vision.trim()}`);
  }
  if (data.values.trim()) {
    sections.push(`### Valores\n${data.values.trim()}`);
  }

  if (sections.length === 0) {
    return data.rawMarkdown.trim();
  }

  return `${sections.join('\n\n')}\n\n---\n\n${data.rawMarkdown.trim()}`;
}
