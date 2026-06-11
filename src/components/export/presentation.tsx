'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import { BLOCK_DEFINITIONS, STAGES } from '@/lib/data/block-definitions';
import type { BrandBlock } from '@/lib/db/types';
import ReactMarkdown from 'react-markdown';

export function Presentation() {
  const { activeBrand } = useBrand();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [blocks, setBlocks] = useState<BrandBlock[]>([]);

  useEffect(() => {
    if (!activeBrand) {
      setBlocks([]);
      return;
    }
    let cancelled = false;
    async function loadData() {
      const data = await db.getBrandBlocks(activeBrand!.id);
      if (!cancelled) {
        setBlocks(data);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [activeBrand]);

  const totalSlides = BLOCK_DEFINITIONS.length;

  const goNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isFullscreen) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault();
        goNext();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        goPrev();
        break;
      case 'Escape':
        setIsFullscreen(false);
        break;
    }
  }, [isFullscreen, goNext, goPrev]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const enterFullscreen = () => {
    setCurrentSlide(0);
    setIsFullscreen(true);
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Maximize2 className="mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-400">Selecciona una marca para presentar</p>
      </div>
    );
  }

  // Fullscreen presentation mode
  if (isFullscreen) {
    const blockDef = BLOCK_DEFINITIONS[currentSlide];
    const brandBlock = blocks.find(b => b.block_id === blockDef.id);
    const stage = STAGES.find(s => s.key === blockDef.stage);
    const content = brandBlock?.content_md || '';

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
              style={{ backgroundColor: stage?.color || '#8B5CF6' }}
            >
              {blockDef.stage}
            </span>
            <span className="text-sm font-medium text-slate-500">{activeBrand.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm font-medium text-slate-400">
              {currentSlide + 1} / {totalSlides}
            </span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="rounded-lg border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              title="Salir (ESC)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Slide content */}
        <div className="flex flex-1 items-center justify-center overflow-hidden px-16 py-12">
          <div className="w-full max-w-3xl">
            {/* Block number and stage */}
            <div className="mb-4 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white"
                style={{ backgroundColor: stage?.color || '#8B5CF6' }}
              >
                {blockDef.id}
              </span>
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: stage?.color || '#8B5CF6' }}
                >
                  Etapa {blockDef.stage} — {stage?.label}
                </p>
              </div>
            </div>

            {/* Title */}
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900">
              {blockDef.title}
            </h1>

            {/* Description */}
            <p className="mb-6 text-base text-slate-400">{blockDef.description}</p>

            {/* Content */}
            <div className="max-h-[50vh] overflow-y-auto pr-2">
              {content.trim() ? (
                <div className="markdown-preview max-w-none">
                  <ReactMarkdown
                    components={{
                      a: ({ href, children, ...props }) => {
                        if (href === '#marker-pendiente') {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200 select-none">
                              {children}
                            </span>
                          );
                        }
                        if (href === '#marker-verificar') {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200 select-none">
                              {children}
                            </span>
                          );
                        }
                        return <a href={href} {...props}>{children}</a>;
                      },
                    }}
                  >
                    {content
                      .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                      .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-lg text-slate-300 italic">Sin contenido</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
          <button
            onClick={goPrev}
            disabled={currentSlide === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          {/* Slide dots */}
          <div className="flex items-center gap-1">
            {BLOCK_DEFINITIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentSlide ? 'w-4 bg-violet-500' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            disabled={currentSlide === totalSlides - 1}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-30"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Preview / launch button
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Modo Presentación</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Vista de diapositivas a pantalla completa — un bloque por slide
          </p>
        </div>
        <button
          onClick={enterFullscreen}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
        >
          <Maximize2 className="h-4 w-4" />
          Iniciar presentación
        </button>
      </div>

      {/* Slide preview grid */}
      <div className="grid grid-cols-4 gap-2 p-4">
        {BLOCK_DEFINITIONS.map((def, i) => {
          const block = blocks.find(b => b.block_id === def.id);
          const stage = STAGES.find(s => s.key === def.stage);
          const hasContent = !!block?.content_md?.trim();
          return (
            <button
              key={def.id}
              onClick={() => { setCurrentSlide(i); setIsFullscreen(true); }}
              className={`group flex flex-col rounded-lg border p-2.5 text-left transition-all hover:shadow-md ${
                hasContent ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-dashed border-slate-200 bg-slate-50'
              }`}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <span
                  className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white"
                  style={{ backgroundColor: stage?.color || '#8B5CF6' }}
                >
                  {def.id}
                </span>
                <span className="truncate text-[10px] font-medium text-slate-500">{def.title}</span>
              </div>
              {hasContent ? (
                <p className="line-clamp-2 text-[10px] text-slate-400">{block?.content_md?.slice(0, 80)}</p>
              ) : (
                <p className="text-[10px] text-slate-300 italic">Sin contenido</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
