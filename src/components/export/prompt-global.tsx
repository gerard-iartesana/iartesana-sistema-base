'use client';

import React, { useState, useEffect } from 'react';
import { Copy, FileDown, Check, Info, AlertTriangle, FileText } from 'lucide-react';
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import { exportPromptGlobal, getPromptGlobalInfo } from '@/lib/utils/export';
import { getBlockById } from '@/lib/data/block-definitions';

export function PromptGlobal() {
  const { activeBrand } = useBrand();
  const [prompt, setPrompt] = useState('');
  const [info, setInfo] = useState<{ includedBlocks: number[]; excludedBlocks: number[]; pendienteCount: number } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (!activeBrand) {
      setPrompt('');
      setInfo(null);
      return;
    }
    let cancelled = false;
    async function loadData() {
      const [blocks, markers] = await Promise.all([
        db.getBrandBlocks(activeBrand!.id),
        db.getMarkers(activeBrand!.id),
      ]);
      if (!cancelled) {
        setPrompt(exportPromptGlobal(activeBrand!, blocks));
        setInfo(getPromptGlobalInfo(blocks, markers));
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [activeBrand]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleDownload = (ext: 'md' | 'txt') => {
    if (!activeBrand) return;
    const mimeType = ext === 'md' ? 'text/markdown' : 'text/plain';
    const blob = new Blob([prompt], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBrand.slug}_prompt_global.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-400">Selecciona una marca para generar el Prompt Global</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Prompt Global</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            System prompt compilado para agentes IA — {activeBrand.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {copyFeedback ? (
              <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copiado</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Copiar</>
            )}
          </button>
          <button
            onClick={() => handleDownload('md')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <FileDown className="h-3.5 w-3.5" />
            .md
          </button>
          <button
            onClick={() => handleDownload('txt')}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
          >
            <FileDown className="h-3.5 w-3.5" />
            .txt
          </button>
        </div>
      </div>

      {/* Info bar */}
      {info && (
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <Info className="h-3.5 w-3.5" />
              <span className="font-medium">{info.includedBlocks.length} bloques incluidos</span>
            </div>
            {info.excludedBlocks.length > 0 && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span>{info.excludedBlocks.length} excluidos (sin contenido):</span>
                <span className="font-mono text-[10px]">
                  {info.excludedBlocks.map(id => {
                    const def = getBlockById(id);
                    return def ? `${id}` : id;
                  }).join(', ')}
                </span>
              </div>
            )}
            {info.pendienteCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">{info.pendienteCount} marcadores [pendiente] excluidos</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="max-h-[600px] overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap font-mono text-xs text-slate-600 leading-relaxed">{prompt}</pre>
      </div>
    </div>
  );
}
