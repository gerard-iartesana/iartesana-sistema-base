export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface VerbalSection {
  title: string;
  type: 'voz_escrita' | 'tuteo' | 'usamos' | 'evitar' | 'negocio' | 'general';
  content: string;
  items: GlossaryItem[];
}

export function parseGlossaryItems(content: string): GlossaryItem[] {
  const items: GlossaryItem[] = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');

  let currentItem: GlossaryItem | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern 1: - **Term** - Definition or **Term.** Definition
    const boldMatch = trimmed.match(/^(?:-\s*|\*\s*)?\*\*([^*]+?)\*\*[\s\.:\-\—]*(.*)/);
    // Pattern 2: - *Term* - Definition
    const italicMatch = trimmed.match(/^(?:-\s*|\*\s*)?\*([^*]+?)\*[\s\.:\-\—]*(.*)/);

    if (boldMatch) {
      if (currentItem) items.push(currentItem);
      currentItem = {
        term: boldMatch[1].trim(),
        definition: boldMatch[2].trim(),
      };
    } else if (italicMatch) {
      if (currentItem) items.push(currentItem);
      currentItem = {
        term: italicMatch[1].trim(),
        definition: italicMatch[2].trim(),
      };
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      // Simple bullet list item (without bold/italic)
      if (currentItem) items.push(currentItem);
      const text = trimmed.substring(1).trim();
      const splitPos = text.indexOf('—') !== -1 ? text.indexOf('—') : text.indexOf(':');
      if (splitPos !== -1) {
        currentItem = {
          term: text.substring(0, splitPos).trim(),
          definition: text.substring(splitPos + 1).trim(),
        };
      } else {
        currentItem = {
          term: '',
          definition: text,
        };
      }
    } else {
      // Paragraph line. If we have a current item, it might be a continuation.
      // Otherwise, if the line contains a dot like "Term. Definition", parse it.
      if (currentItem) {
        currentItem.definition += ' ' + trimmed;
      } else {
        const dotSplit = trimmed.match(/^([A-Z][A-Za-z0-9\s\/ñÑáéíóúÁÉÍÓÚ]+?)\.\s+(.+)/);
        if (dotSplit) {
          items.push({
            term: dotSplit[1].trim(),
            definition: dotSplit[2].trim(),
          });
        } else {
          // Plain paragraph
          items.push({
            term: '',
            definition: trimmed,
          });
        }
      }
    }
  }

  if (currentItem) {
    items.push(currentItem);
  }

  return items;
}

export function parseVerbalIdentity(markdown: string): VerbalSection[] {
  if (!markdown) return [];

  const sections: VerbalSection[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let currentSection: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if line is a header
    const isHeading = line.startsWith('## ') || line.startsWith('### ');
    const isBoldHeading = trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 80;
    const isBoldHeadingWithColon = trimmed.startsWith('**') && trimmed.endsWith(':**') && trimmed.length < 80;

    if (isHeading || isBoldHeading || isBoldHeadingWithColon) {
      if (currentSection) {
        sections.push(finalizeSection(currentSection.title, currentSection.lines));
      }
      
      let title = trimmed;
      if (isHeading) {
        title = line.replace(/^#{2,3}\s+/, '').trim();
      } else {
        title = trimmed.replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').trim();
      }

      currentSection = {
        title,
        lines: [],
      };
    } else {
      if (currentSection) {
        currentSection.lines.push(line);
      } else if (trimmed) {
        // If there's content before any heading, start a default section
        currentSection = {
          title: 'Introducción',
          lines: [line],
        };
      }
    }
  }

  if (currentSection) {
    sections.push(finalizeSection(currentSection.title, currentSection.lines));
  }

  return sections;
}

function finalizeSection(title: string, lines: string[]): VerbalSection {
  const content = lines.join('\n').trim();
  const normalizedTitle = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let type: VerbalSection['type'] = 'general';

  if (
    normalizedTitle.includes('voz escrita') || 
    normalizedTitle.includes('frases-eje') || 
    normalizedTitle.includes('principios') ||
    normalizedTitle.includes('regla de oro verbal')
  ) {
    type = 'voz_escrita';
  } else if (
    normalizedTitle.includes('idioma') || 
    normalizedTitle.includes('tuteo') || 
    normalizedTitle.includes('tu o vosotros')
  ) {
    type = 'tuteo';
  } else if (
    normalizedTitle.includes('palabras que usamos') || 
    normalizedTitle.includes('lexico propio') || 
    normalizedTitle.includes('vocabulario nativo') ||
    normalizedTitle.includes('nos definen')
  ) {
    type = 'usamos';
  } else if (
    normalizedTitle.includes('palabras que no usamos') || 
    normalizedTitle.includes('lexico vetado') || 
    normalizedTitle.includes('palabras prohibidas') ||
    normalizedTitle.includes('evitar') ||
    normalizedTitle.includes('vetado')
  ) {
    type = 'evitar';
  } else if (
    normalizedTitle.includes('nombramos') || 
    normalizedTitle.includes('lexico nombrado') || 
    normalizedTitle.includes('del negocio') ||
    normalizedTitle.includes('productos') ||
    normalizedTitle.includes('tagline')
  ) {
    type = 'negocio';
  }

  const items = ['usamos', 'evitar', 'negocio'].includes(type) ? parseGlossaryItems(content) : [];

  return {
    title,
    type,
    content,
    items,
  };
}

export function parseSavedVerbalImages(md: string): Record<string, string> {
  if (!md) return {};
  const match = md.match(/<!-- VERBAL_IMAGES:\s*(\{[\s\S]+?\})\s*-->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error('Error parsing saved verbal images JSON:', e);
    }
  }
  return {};
}

export function splitBlock6Content(md: string): { rawMarkdown: string; images: Record<string, string> } {
  const images = parseSavedVerbalImages(md);
  let rawMarkdown = md || '';
  
  // Remove the comment
  rawMarkdown = rawMarkdown.replace(/\s*\n*<!-- VERBAL_IMAGES:[\s\S]+?-->/g, '').trim();

  return {
    rawMarkdown,
    images
  };
}

export function compileBlock6Content(rawMarkdown: string, images: Record<string, string>): string {
  const cleanedMarkdown = rawMarkdown.replace(/\s*\n*<!-- VERBAL_IMAGES:[\s\S]+?-->/g, '').trim();
  const jsonComment = `<!-- VERBAL_IMAGES:${JSON.stringify(images)} -->`;
  return `${cleanedMarkdown}\n\n${jsonComment}`;
}

