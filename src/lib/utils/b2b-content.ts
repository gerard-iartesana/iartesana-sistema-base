export interface B2BModule {
  title: string;
  text: string;
}

export function parseB2BContent(markdown: string): { introMarkdown: string; modules: B2BModule[] } {
  if (!markdown) return { introMarkdown: '', modules: [] };

  const cleanMd = markdown.replace(/\r\n/g, '\n');
  const sections = cleanMd.split(/^### /gm);
  
  const introMarkdown = sections[0].trim();
  const modules: B2BModule[] = [];

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const title = lines[0].trim();
    const text = lines.slice(1).join('\n').trim();

    modules.push({ title, text });
  }

  return { introMarkdown, modules };
}

export function compileB2BContent(introMarkdown: string, modules: B2BModule[]): string {
  let md = (introMarkdown || '').trim();
  if (modules.length === 0) return md;

  for (const mod of modules) {
    md += `\n\n### ${mod.title}\n${mod.text}`;
  }

  return md.trim();
}
