'use client';

import React, { useState, useEffect } from 'react';
import { FileDown, Copy, Check, FileText } from 'lucide-react';
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import { exportFullMarkdown } from '@/lib/utils/export';

export function MarkdownExport() {
  const { activeBrand } = useBrand();
  const [markdown, setMarkdown] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (!activeBrand) {
      setMarkdown('');
      return;
    }
    let cancelled = false;
    async function loadData() {
      const [blocks, markers] = await Promise.all([
        db.getBrandBlocks(activeBrand!.id),
        db.getMarkers(activeBrand!.id),
      ]);
      if (!cancelled) {
        setMarkdown(exportFullMarkdown(activeBrand!, blocks, markers));
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [activeBrand]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!activeBrand) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBrand.slug}_sistema_base_v${activeBrand.doc_version}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-400">Selecciona una marca para exportar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Exportar Documento Completo</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {activeBrand.name} — v{activeBrand.doc_version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {copyFeedback ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copiar al portapapeles
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
          >
            <FileDown className="h-3.5 w-3.5" />
            Descargar .md
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="max-h-[600px] overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 leading-relaxed">{markdown}</pre>
      </div>
    </div>
  );
}
