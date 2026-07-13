export interface SegmentationModule {
  title: string;
  text: string;
  image: string;
}

export function parseSegmentationContent(markdown: string): { introMarkdown: string; modules: SegmentationModule[] } {
  if (!markdown) return { introMarkdown: '', modules: [] };

  const cleanMd = markdown.replace(/\r\n/g, '\n');
  const sections = cleanMd.split(/^### /gm);
  
  const introMarkdown = sections[0].trim();
  const modules: SegmentationModule[] = [];

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    // Check for image comment: <!-- image: ... -->
    const imgMatch = content.match(/<!--\s*image:\s*([^\s>]+)\s*-->/i);
    const image = imgMatch ? imgMatch[1] : '';

    // Remove image comment from text content
    const text = content.replace(/<!--\s*image:[\s\S]*?-->/gi, '').trim();

    modules.push({ title, text, image });
  }

  return { introMarkdown, modules };
}

export function compileSegmentationContent(introMarkdown: string, modules: SegmentationModule[]): string {
  let md = (introMarkdown || '').trim();
  if (modules.length === 0) return md;

  for (const mod of modules) {
    md += `\n\n### ${mod.title}\n`;
    if (mod.image) {
      md += `<!-- image: ${mod.image} -->\n`;
    }
    md += `${mod.text}`;
  }

  return md.trim();
}
