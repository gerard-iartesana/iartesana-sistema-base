export function splitBlock10Content(rawContent: string): { rawMarkdown: string; itemsSection: string } {
  if (!rawContent) return { rawMarkdown: '', itemsSection: '' };

  const cleanMd = rawContent.replace(/\r\n/g, '\n');
  const markerIndex = cleanMd.indexOf('### Elementos de la Biblioteca');
  const firstItemIndex = cleanMd.indexOf('#### ');

  let cutoffIndex = -1;
  if (markerIndex !== -1 && firstItemIndex !== -1) {
    cutoffIndex = Math.min(markerIndex, firstItemIndex);
  } else if (markerIndex !== -1) {
    cutoffIndex = markerIndex;
  } else if (firstItemIndex !== -1) {
    cutoffIndex = firstItemIndex;
  }

  if (cutoffIndex !== -1) {
    const rawMarkdown = cleanMd.substring(0, cutoffIndex).trim();
    const itemsSection = cleanMd.substring(cutoffIndex).trim();
    return { rawMarkdown, itemsSection };
  }

  // If there are no item headers, the whole text is raw user markdown
  if (cleanMd.startsWith('####') || cleanMd.includes('### Elementos de la Biblioteca')) {
    return { rawMarkdown: '', itemsSection: cleanMd.trim() };
  }

  return { rawMarkdown: cleanMd.trim(), itemsSection: '' };
}

export function compileBlock10Content(rawMarkdown: string, itemsSection: string): string {
  let md = rawMarkdown.trim();
  if (itemsSection.trim()) {
    md += '\n\n' + itemsSection.trim();
  }
  return md;
}
