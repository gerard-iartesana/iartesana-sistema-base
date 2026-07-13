export interface SegmentationModule {
  title: string;
  text: string;
  image: string;
}

export function parseSegmentationContent(markdown: string): { introMarkdown: string; modules: SegmentationModule[] } {
  if (!markdown) return { introMarkdown: '', modules: [] };

  const cleanMd = markdown.replace(/\r\n/g, '\n');

  // Extract reference style definitions at the end of the markdown, e.g. [img_ref_1]: data:image...
  const refRegex = /^\[([^\]]+)\]:\s*([^\n]+)/gm;
  const references: Record<string, string> = {};
  let match;
  while ((match = refRegex.exec(cleanMd)) !== null) {
    references[match[1]] = match[2].trim();
  }

  // Remove the reference definitions from the markdown content to parse the text cleanly
  const mainContent = cleanMd.replace(/^\[([^\]]+)\]:\s*[^\n]+/gm, '').trim();

  const sections = mainContent.split(/^### /gm);
  const introMarkdown = sections[0].trim();
  const modules: SegmentationModule[] = [];

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const title = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    // Check for image comment: <!-- image: ... -->
    const imgMatch = content.match(/<!--\s*image:\s*([^\s>]+)\s*-->/i);
    let imageRef = imgMatch ? imgMatch[1] : '';

    // Resolve the image: if it matches a reference, use the base64 value, else use as-is
    const image = references[imageRef] || imageRef;

    // Remove image comment from text content
    const text = content.replace(/<!--\s*image:[\s\S]*?-->/gi, '').trim();

    modules.push({ title, text, image });
  }

  return { introMarkdown, modules };
}

export function compileSegmentationContent(introMarkdown: string, modules: SegmentationModule[]): string {
  let md = (introMarkdown || '').trim();
  if (modules.length === 0) return md;

  const imageReferences: { id: string; base64: string }[] = [];

  for (let idx = 0; idx < modules.length; idx++) {
    const mod = modules[idx];
    md += `\n\n### ${mod.title}\n`;
    if (mod.image) {
      if (mod.image.startsWith('data:image')) {
        // Create a clean reference for base64 image
        const refId = `img_ref_${idx + 1}`;
        imageReferences.push({ id: refId, base64: mod.image });
        md += `<!-- image: ${refId} -->\n`;
      } else {
        // Keep literal paths (e.g. preset paths) as-is
        md += `<!-- image: ${mod.image} -->\n`;
      }
    }
    md += `${mod.text}`;
  }

  // Append reference-style base64 definitions at the very bottom
  if (imageReferences.length > 0) {
    md += '\n\n';
    md += imageReferences.map(ref => `[${ref.id}]: ${ref.base64}`).join('\n');
  }

  return md.trim();
}
