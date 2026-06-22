export interface VoiceTension {
  left: string;
  right: string;
  value: number;
  description: string;
}

export interface Block5Content {
  rawMarkdown: string;
  tensions: VoiceTension[];
}

export function parseVoiceTensions(markdown: string): VoiceTension[] {
  if (!markdown) return [];
  
  // Try to parse comment first
  const commentMatch = markdown.match(/<!-- VOICE_TENSIONS:\s*(\[[\s\S]+?\])\s*-->/);
  if (commentMatch) {
    try {
      return JSON.parse(commentMatch[1]);
    } catch (e) {
      console.error('Error parsing VOICE_TENSIONS JSON:', e);
    }
  }

  // Fallback: Parse markdown text
  const cleanMd = markdown.replace(/\r\n/g, '\n').trim();
  const tensions: VoiceTension[] = [];

  // Try parsing iARTESANA format (bold title containing arrows or dots)
  const regexArrows = /\*\*([^*]+?)\s*←[\s\S]*?→\s*([^*]+?)\*\*\n([\s\S]*?)(?=(?:\*\*|[#-]\s+\*\*|##|---|$))/g;
  let match;
  while ((match = regexArrows.exec(cleanMd)) !== null) {
    const left = match[1].trim();
    const right = match[2].trim();
    const fullDesc = match[3].trim();
    
    // Parse value if available, e.g., "Sitúa a 60% cercano" or "Sitúa a 65% llano"
    let value = 50;
    const valueMatch = fullDesc.match(/Sitúa a (\d+)%\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)/i);
    if (valueMatch) {
      const pct = parseInt(valueMatch[1], 10);
      const direction = valueMatch[2].toLowerCase();
      // If it mentions the left trait, value is 100 - pct (since value = 100 is fully right)
      // Otherwise if it mentions the right trait, value is pct.
      if (direction.includes(left.toLowerCase().substring(0, 4))) {
        value = 100 - pct;
      } else if (direction.includes(right.toLowerCase().substring(0, 4))) {
        value = pct;
      }
    }

    tensions.push({ left, right, value, description: fullDesc });
  }

  if (tensions.length > 0) return tensions;

  // Try parsing MPC format (list items like "- **Left y Right.** Description")
  const regexList = /(?:^|\n)-\s+\*\*([^*]+?)\s+(?:y|vs\.?|o|\/)\s+([^*]+?)\.\*\*\s*([\s\S]*?)(?=(?:\n-\s+\*\*|\n##|\n---|$))/g;
  while ((match = regexList.exec(cleanMd)) !== null) {
    const left = match[1].trim();
    const right = match[2].trim();
    const desc = match[3].trim();
    tensions.push({
      left: left.charAt(0).toUpperCase() + left.slice(1),
      right: right.charAt(0).toUpperCase() + right.slice(1),
      value: 50,
      description: desc
    });
  }

  return tensions;
}

export function splitBlock5Content(md: string): Block5Content {
  const tensions = parseVoiceTensions(md);
  let rawMarkdown = (md || '').replace(/\r\n/g, '\n');
  
  rawMarkdown = rawMarkdown.replace(/<!-- VOICE_TENSIONS:[\s\S]+?-->/g, '').trim();
  
  if (tensions.length > 0) {
    const firstTension = tensions[0];
    const leftTitle = firstTension.left;
    
    const bulletPatterns = [
      `- **${leftTitle}`,
      `* **${leftTitle}`,
      `**${leftTitle}`
    ];
    
    for (const pattern of bulletPatterns) {
      const idx = rawMarkdown.indexOf(pattern);
      if (idx !== -1) {
        rawMarkdown = rawMarkdown.substring(0, idx).trim();
        break;
      }
    }
  }
  
  return {
    rawMarkdown,
    tensions
  };
}

export function compileVoiceTensions(tensions: VoiceTension[], rawMarkdown: string): string {
  const sections = [];
  
  for (const t of tensions) {
    const leftText = t.left;
    const rightText = t.right;
    
    const dotPos = Math.round(t.value / 10);
    let bar = '';
    for (let i = 0; i <= 10; i++) {
      if (i === dotPos) {
        bar += '●';
      } else if (i === 0) {
        bar += '←';
      } else if (i === 10) {
        bar += '→';
      } else {
        bar += '—';
      }
    }
    
    sections.push(`**${leftText} ${bar} ${rightText}**\n${t.description}`);
  }
  
  const formattedTensions = sections.join('\n\n');
  const jsonComment = `<!-- VOICE_TENSIONS:${JSON.stringify(tensions)} -->`;
  
  const intro = rawMarkdown.trim();
  if (intro) {
    return `${intro}\n\n${formattedTensions}\n\n${jsonComment}`;
  }
  return `${formattedTensions}\n\n${jsonComment}`;
}
