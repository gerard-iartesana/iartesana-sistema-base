'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { Sliders, Check, Plus, Trash2, Scale, ArrowLeftRight } from 'lucide-react';
import {
  parseVoiceTensions,
  splitBlock5Content,
  compileVoiceTensions,
  VoiceTension
} from '@/lib/utils/voice-content';

interface VoiceTensionsLabProps {
  brandId: string;
  content_md: string;
  onUpdate: () => void;
}

export function VoiceTensionsLab({ brandId, content_md, onUpdate }: VoiceTensionsLabProps) {
  const [tensionsList, setTensionsList] = useState<VoiceTension[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync state with content_md prop when it changes
  useEffect(() => {
    const parsed = parseVoiceTensions(content_md);
    setTensionsList(parsed.length > 0 ? parsed : [
      { left: 'Calidez', right: 'Resolución', value: 50, description: '' }
    ]);
  }, [content_md]);

  const saveToDb = async (list: VoiceTension[]) => {
    setSaveState('saving');
    try {
      const parsed = splitBlock5Content(content_md);
      const updatedMarkdown = compileVoiceTensions(list, parsed.rawMarkdown);
      await db.updateBrandBlock(brandId, 5, { content_md: updatedMarkdown });
      onUpdate();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('[VoiceTensionsLab] Error saving voice tensions:', err);
      setSaveState('idle');
    }
  };

  const handleTensionChange = (index: number, field: keyof VoiceTension, value: string | number) => {
    const newList = [...tensionsList];
    newList[index] = {
      ...newList[index],
      [field]: value
    } as any;
    setTensionsList(newList);

    setSaveState('idle');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToDb(newList);
    }, 1500);
  };

  const handleAddTension = () => {
    const newList = [...tensionsList, { left: 'Término A', right: 'Término B', value: 50, description: '' }];
    setTensionsList(newList);
    saveToDb(newList);
  };

  const handleRemoveTension = (index: number) => {
    let newList = tensionsList.filter((_, idx) => idx !== index);
    if (newList.length === 0) {
      newList = [{ left: 'Calidez', right: 'Resolución', value: 50, description: '' }];
    }
    setTensionsList(newList);
    saveToDb(newList);
  };

  // Safe timeout cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-200">
      {/* Header save state */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4.5 w-4.5 text-[#e3599c] animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Laboratorio de Tensiones de Voz</h3>
        </div>
        <div className="h-5">
          {saveState === 'saving' && (
            <span className="text-xs text-slate-400 flex items-center gap-1 select-none animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e3599c] animate-ping" />
              Guardando cambios...
            </span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold select-none">
              <Check className="h-3.5 w-3.5" />
              Guardado ✓
            </span>
          )}
        </div>
      </div>

      {/* Tension Cards List */}
      <div className="space-y-6">
        {tensionsList.map((tension, idx) => {
          const leftPercent = 100 - tension.value;
          const rightPercent = tension.value;
          let tiltLabel = 'Equilibrado';
          let tiltColor = 'text-slate-400 bg-slate-800/50';

          if (leftPercent > 55) {
            tiltLabel = `Inclinado hacia ${tension.left} (${leftPercent}%)`;
            tiltColor = 'text-[#e3599c] bg-[#e3599c]/10 border-[#e3599c]/20';
          } else if (rightPercent > 55) {
            tiltLabel = `Inclinado hacia ${tension.right} (${rightPercent}%)`;
            tiltColor = 'text-[#e3599c] bg-[#e3599c]/10 border-[#e3599c]/20';
          }

          return (
            <div key={idx} className="bg-slate-950 rounded-xl p-5 border border-slate-800/80 relative group hover:border-slate-700 transition-colors">
              <button
                onClick={() => handleRemoveTension(idx)}
                className="text-slate-500 hover:text-red-400 transition-colors p-1.5 absolute right-3 top-3"
                title="Eliminar tensión"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Title / Inputs Left & Right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pr-8">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Extremo Izquierdo</label>
                  <input
                    type="text"
                    value={tension.left}
                    onChange={(e) => handleTensionChange(idx, 'left', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ej. Cercano"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Extremo Derecho</label>
                  <input
                    type="text"
                    value={tension.right}
                    onChange={(e) => handleTensionChange(idx, 'right', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-850 rounded px-3 py-1.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Ej. Profesional"
                  />
                </div>
              </div>

              {/* Visual Balance Slider */}
              <div className="bg-slate-900/50 rounded-lg p-4 mb-4 border border-slate-850">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 select-none mb-2">
                  <span className={leftPercent > 50 ? 'text-white' : ''}>{tension.left} ({leftPercent}%)</span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] ${tiltColor}`}>{tiltLabel}</span>
                  <span className={rightPercent > 50 ? 'text-white' : ''}>{tension.right} ({rightPercent}%)</span>
                </div>

                {/* Sleek Custom Track and Dot */}
                <div className="relative flex items-center py-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tension.value}
                    onChange={(e) => handleTensionChange(idx, 'value', parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#e3599c] focus:outline-none"
                  />
                </div>

                {/* CSS styled bar mockup below the slider just for higher visual accuracy */}
                <div className="relative w-full h-[3px] bg-slate-800 rounded-full mt-1.5">
                  <div 
                    className="absolute top-0 bottom-0 bg-[#e3599c] rounded-full"
                    style={{
                      left: tension.value < 50 ? `${tension.value}%` : '50%',
                      right: tension.value >= 50 ? `${100 - tension.value}%` : '50%',
                    }}
                  />
                </div>
              </div>

              {/* Tension Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Descripción del Equilibrio</label>
                <textarea
                  value={tension.description}
                  onChange={(e) => handleTensionChange(idx, 'description', e.target.value)}
                  placeholder="Detalla qué define esta tensión, cómo se sitúa la marca y qué excesos/errores deben evitarse en ambos extremos..."
                  className="w-full h-24 bg-slate-900 border border-slate-850 rounded p-2.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500 transition-colors resize-none editor-textarea"
                  spellCheck={false}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Tension Button */}
      <button
        onClick={handleAddTension}
        className="mt-4 flex items-center justify-center gap-1.5 w-full rounded border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900/50 px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-all font-semibold"
      >
        <Plus className="h-4 w-4" />
        Añadir Tensión
      </button>
    </div>
  );
}
