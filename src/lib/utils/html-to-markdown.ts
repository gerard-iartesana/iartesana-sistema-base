import React from 'react';

export function convertHtmlToMarkdown(html: string): string {
  if (typeof window === 'undefined') return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return nodeToMarkdown(doc.body).trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();

  // Recursively process children
  let childrenMarkdown = '';
  for (let i = 0; i < element.childNodes.length; i++) {
    childrenMarkdown += nodeToMarkdown(element.childNodes[i]);
  }

  // Detect style-based bold/italic (e.g. from Google Docs/Word spans)
  const style = element.getAttribute('style') || '';
  const hasBoldStyle = /\bfont-weight\s*:\s*(?:bold|[7-9]00)\b/i.test(style);
  const hasItalicStyle = /\bfont-style\s*:\s*italic\b/i.test(style);

  const isBold = tag === 'strong' || tag === 'b' || hasBoldStyle;
  const isItalic = tag === 'em' || tag === 'i' || hasItalicStyle;

  // Apply bold/italic to the children markdown first
  let formattedContent = childrenMarkdown;
  if (isBold && formattedContent.trim()) {
    // Keep spaces outside the markdown formatting markers
    const leadingSpace = formattedContent.match(/^\s*/)?.[0] || '';
    const trailingSpace = formattedContent.match(/\s*$/)?.[0] || '';
    formattedContent = `${leadingSpace}**${formattedContent.trim()}**${trailingSpace}`;
  }
  if (isItalic && formattedContent.trim()) {
    const leadingSpace = formattedContent.match(/^\s*/)?.[0] || '';
    const trailingSpace = formattedContent.match(/\s*$/)?.[0] || '';
    formattedContent = `${leadingSpace}*${formattedContent.trim()}*${trailingSpace}`;
  }

  switch (tag) {
    case 'h1':
      return `\n# ${formattedContent.trim()}\n\n`;
    case 'h2':
      return `\n## ${formattedContent.trim()}\n\n`;
    case 'h3':
      return `\n### ${formattedContent.trim()}\n\n`;
    case 'h4':
    case 'h5':
    case 'h6':
      return `\n#### ${formattedContent.trim()}\n\n`;
    case 'p':
      return `\n${formattedContent.trim()}\n\n`;
    case 'div':
      return formattedContent.trim() ? `\n${formattedContent.trim()}\n\n` : '';
    case 'br':
      return '\n';
    case 'li':
      return `\n- ${formattedContent.trim()}`;
    case 'ul':
    case 'ol':
      return `\n${formattedContent}\n\n`;
    case 'a':
      const href = element.getAttribute('href') || '';
      return `[${formattedContent.trim()}](${href})`;
    case 'strong':
    case 'b':
    case 'em':
    case 'i':
      // Already handled above
      return formattedContent;
    default:
      return formattedContent;
  }
}

export const handleMarkdownPaste = (
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  onChange: (val: string) => void
) => {
  const html = e.clipboardData.getData('text/html');
  if (html) {
    e.preventDefault();
    const rawMarkdown = convertHtmlToMarkdown(html);
    const markdown = rawMarkdown
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newValue = before + markdown + after;

    onChange(newValue);

    // Keep focus and select after the pasted markdown
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + markdown.length, start + markdown.length);
    }, 0);
  }
};
