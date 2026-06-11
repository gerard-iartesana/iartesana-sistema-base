'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Eye, SplitSquareHorizontal, Edit3, ChevronDown, Check } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import { getBlockById } from '@/lib/data/block-definitions';
import { parseMarkers } from '@/lib/utils/markers';
import type { BlockStatus, BrandBlock } from '@/lib/db/types';

type ViewMode = 'edit' | 'preview' | 'split';

interface BlockEditorProps {
  brandId: string;
  blockId: number;
  onSave?: () => void;
}

const STATUS_OPTIONS: { value: BlockStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'vacio', label: 'Vacío', color: 'text-slate-500', bgColor: 'bg-slate-50' },
  { value: 'borrador', label: 'Borrador', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { value: 'en_revision', label: 'En revisión', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  { value: 'validado', label: 'Validado', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
];

function renderMarkdownPreview(content: string): string {
  if (!content.trim()) return '<p class="text-slate-400 italic">Sin contenido</p>';

  // Clean mockup base64 image tags from preview pane
  const cleanContent = content.replace(/\s*\n*!\[Mockup (Tarjeta|Movil|Papel A4|Camiseta|Bolso Tote)\]\(data:image\/[^)]+\)/g, '').trim();
  if (!cleanContent) return '<p class="text-slate-400 italic">Sin contenido</p>';

  let html = cleanContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Markers
    .replace(
      /\[(pendiente):\s*([^\]]+)\]/gi,
      '<span class="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">⏳ $2</span>'
    )
    .replace(
      /\[(verificar):\s*([^\]]+)\]/gi,
      '<span class="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">⚠️ $2</span>'
    )
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-slate-800 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-slate-800 mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-slate-900 mt-6 mb-2">$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="font-bold"><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-violet-600">$1</code>')
    // Blockquotes
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-3 border-slate-300 pl-3 text-slate-600 italic my-2">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-4 border-slate-200" />')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-slate-700">$1</li>')
    // Ordered list items
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm text-slate-700">$2</li>')
    // Line breaks → paragraphs
    .replace(/\n\n/g, '</p><p class="text-sm text-slate-700 leading-relaxed my-2">')
    .replace(/\n/g, '<br />');

  return `<p class="text-sm text-slate-700 leading-relaxed my-2">${html}</p>`;
}

export function BlockEditor({ brandId, blockId, onSave }: BlockEditorProps) {
  const blockDef = getBlockById(blockId);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<BlockStatus>('vacio');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [confirmValidado, setConfirmValidado] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Load block data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const blocks = await db.getBrandBlocks(brandId);
      if (cancelled) return;
      const block = blocks.find(b => b.block_id === blockId);
      if (block) {
        let rawContent = block.content_md || '';
        if (blockId === 7) {
          rawContent = rawContent.replace(/\s*\n*!\[Mockup (Tarjeta|Movil|Papel A4|Camiseta|Bolso Tote)\]\(data:image\/[^)]+\)/g, '').trim();
        }
        setContent(rawContent);
        setStatus(block.status);
      } else {
        setContent('');
        setStatus('vacio');
      }
      setSaveState('idle');
    }
    load();
    return () => { cancelled = true; };
  }, [brandId, blockId]);

  // Save function
  const save = useCallback(async (text: string) => {
    setSaveState('saving');
    try {
      let fullText = text;

      // If editing block 7, read the latest mockups from the database to merge them and avoid overwriting
      if (blockId === 7) {
        const blocks = await db.getBrandBlocks(brandId);
        const latestBlock = blocks.find(b => b.block_id === 7);
        const latestRaw = latestBlock?.content_md || '';
        const matches = latestRaw.match(/\s*\n*!\[Mockup (Tarjeta|Movil|Papel A4|Camiseta|Bolso Tote)\]\(data:image\/[^)]+\)/g) || [];
        const latestMockupsStr = matches.join('\n');
        if (latestMockupsStr) {
          fullText = text.trim() ? `${text.trim()}\n\n${latestMockupsStr.trim()}` : latestMockupsStr.trim();
        }
      }

      const result = await db.updateBrandBlock(brandId, blockId, { content_md: fullText });
      if (!result) {
        console.error('[BlockEditor] Save returned undefined - update may have failed');
        setSaveState('idle');
        return;
      }
      onSave?.();
      setTimeout(() => setSaveState('saved'), 200);
      setTimeout(() => setSaveState('idle'), 2500);
    } catch (err) {
      console.error('[BlockEditor] Save error:', err);
      setSaveState('idle');
    }
  }, [brandId, blockId, onSave]);

  // Autosave with debounce
  const handleContentChange = (value: string) => {
    setContent(value);
    setSaveState('idle');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => save(value), 2000);
  };

  // HTML to Markdown Paste Handler
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html');
    if (html) {
      e.preventDefault();
      const rawMarkdown = convertHtmlToMarkdown(html);
      const markdown = rawMarkdown
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        const newValue = before + markdown + after;

        handleContentChange(newValue);

        // Reset cursor selection to after the pasted markdown
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + markdown.length, start + markdown.length);
        }, 0);
      }
    }
  };

  // Status change
  const handleStatusChange = async (newStatus: BlockStatus) => {
    if (newStatus === 'validado') {
      setConfirmValidado(true);
      setShowStatusDropdown(false);
      return;
    }
    setStatus(newStatus);
    await db.updateBrandBlock(brandId, blockId, { status: newStatus });
    setShowStatusDropdown(false);
    onSave?.();
  };

  const confirmValidadoAction = async () => {
    setStatus('validado');
    await db.updateBrandBlock(brandId, blockId, { status: 'validado' });
    setConfirmValidado(false);
    onSave?.();
  };

  // Close status dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  if (!blockDef) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Bloque no encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="sticky top-0 bg-white z-20 flex items-start justify-between border-b border-slate-200 px-5 py-4 rounded-t-xl shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-600">
              {blockDef.id}
            </span>
            <h2 className="text-base font-semibold text-slate-800">{blockDef.title}</h2>
          </div>
          <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{blockDef.description}</p>
        </div>

        <div className="flex items-center gap-2 ml-3">
          {/* Save indicator */}
          <div className="flex items-center gap-1 text-xs min-w-[90px] justify-end">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1 text-slate-400 save-indicator">
                <Save className="h-3 w-3 animate-pulse" /> Guardando…
              </span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-500 save-indicator">
                <Check className="h-3 w-3" /> Guardado ✓
              </span>
            )}
          </div>

          {/* Status dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${currentStatusConfig.bgColor} ${currentStatusConfig.color} border-slate-200 hover:border-slate-300`}
            >
              {currentStatusConfig.label}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 ${
                      status === opt.value ? 'font-semibold' : ''
                    } ${opt.color}`}
                  >
                    {status === opt.value && <Check className="h-3 w-3" />}
                    <span className={status !== opt.value ? 'ml-5' : ''}>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50">
            <button
              onClick={() => setViewMode('edit')}
              className={`rounded-l-lg px-2 py-1.5 transition-all ${viewMode === 'edit' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Editor"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1.5 transition-all ${viewMode === 'split' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Split"
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`rounded-r-lg px-2 py-1.5 transition-all ${viewMode === 'preview' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Preview"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirm validado dialog */}
      {confirmValidado && (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-700">
              ¿Confirmas que este bloque ha sido revisado y validado por una persona? Esta acción es intencional.
            </p>
            <div className="flex gap-2 ml-3">
              <button
                onClick={confirmValidadoAction}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
              >
                Sí, validar
              </button>
              <button
                onClick={() => setConfirmValidado(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor / Preview */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: '400px' }}>
        {/* Editor pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-slate-200' : 'w-full'}`}>
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Markdown</span>
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={`Escribe el contenido de "${blockDef.title}" en Markdown…\n\nUsa [pendiente: texto] para marcar huecos y [verificar: texto] para datos a confirmar.`}
              className="editor-textarea flex-1 w-full bg-white px-5 py-4 text-slate-700 placeholder-slate-300 outline-none border-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`flex flex-col ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
            <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Vista previa</span>
            </div>
            <div
              className="flex-1 overflow-y-auto px-5 py-4"
              dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HTML-to-Markdown parser for pasting rich text
// ---------------------------------------------------------------------------
function convertHtmlToMarkdown(html: string): string {
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

  switch (tag) {
    case 'h1':
      return `\n# ${childrenMarkdown.trim()}\n\n`;
    case 'h2':
      return `\n## ${childrenMarkdown.trim()}\n\n`;
    case 'h3':
      return `\n### ${childrenMarkdown.trim()}\n\n`;
    case 'h4':
    case 'h5':
    case 'h6':
      return `\n#### ${childrenMarkdown.trim()}\n\n`;
    case 'p':
      return `\n${childrenMarkdown.trim()}\n\n`;
    case 'strong':
    case 'b':
      return `**${childrenMarkdown}**`;
    case 'em':
    case 'i':
      return `*${childrenMarkdown}*`;
    case 'code':
      return `\`${childrenMarkdown}\``;
    case 'pre':
      return `\n\`\`\`\n${childrenMarkdown}\n\`\`\`\n\n`;
    case 'br':
      return '\n';
    case 'li':
      return `\n- ${childrenMarkdown.trim()}`;
    case 'ul':
    case 'ol':
      return `\n${childrenMarkdown}\n\n`;
    case 'a':
      const href = element.getAttribute('href') || '';
      return `[${childrenMarkdown}](${href})`;
    default:
      return childrenMarkdown;
  }
}
