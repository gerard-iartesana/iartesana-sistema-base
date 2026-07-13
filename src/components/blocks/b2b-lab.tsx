'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db/local-storage';
import { 
  parseB2BContent, 
  compileB2BContent,
  B2BModule 
} from '@/lib/utils/b2b-content';
import { handleMarkdownPaste } from '@/lib/utils/html-to-markdown';
import { Trash2, Check, RefreshCw, Plus, ChevronUp, ChevronDown, Users } from 'lucide-react';

interface B2BLabProps {
  brandId: string;
  content_md: string;
  onUpdate: () => void;
  readOnly?: boolean;
}

export function B2BLab({ brandId, content_md, onUpdate, readOnly = false }: B2BLabProps) {
  const { introMarkdown, modules: initialModules } = parseB2BContent(content_md);
  const [modules, setModules] = useState<B2BModule[]>(initialModules);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const saveModules = async (updatedModules: B2BModule[]) => {
    if (readOnly) return;
    setSavingState('saving');
    try {
      const compiled = compileB2BContent(introMarkdown, updatedModules);
      await db.updateBrandBlock(brandId, 9, {
        content_md: compiled,
      });
      setSavingState('saved');
      onUpdate();
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
      console.error('[B2BLab] Failed to save modules:', err);
      setSavingState('idle');
    }
  };

  const handleFieldChange = (index: number, field: keyof B2BModule, value: string) => {
    if (readOnly) return;
    const updated = [...modules];
    updated[index] = { ...updated[index], [field]: value };
    setModules(updated);
    saveModules(updated);
  };

  const handleAddModule = () => {
    if (readOnly) return;
    const newMod: B2BModule = {
      title: 'Nuevo Público B2B / Aliado',
      text: 'Describe aquí la promesa central, expectativas o relación con este público.'
    };
    const updated = [...modules, newMod];
    setModules(updated);
    saveModules(updated);
  };

  const handleRemoveModule = (index: number) => {
    if (readOnly) return;
    if (!confirm('¿Estás seguro de que deseas quitar este público B2B?')) return;
    const updated = modules.filter((_, i) => i !== index);
    setModules(updated);
    saveModules(updated);
  };

  const handleMoveUp = (index: number) => {
    if (readOnly) return;
    if (index === 0) return;
    const updated = [...modules];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setModules(updated);
    saveModules(updated);
  };

  const handleMoveDown = (index: number) => {
    if (readOnly) return;
    if (index === modules.length - 1) return;
    const updated = [...modules];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setModules(updated);
    saveModules(updated);
  };

  return (
    <div className="bg-[#17171a] rounded-2xl border border-[#2a2a2f] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a2f] pb-4 select-none">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-violet-400" />
            Configurador de Relación B2B, Aliados y Propietarios
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Define la promesa y relación para cada tipo de público B2B o aliado estratégico.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {savingState === 'saving' && (
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" /> Guardando...
            </span>
          )}
          {savingState === 'saved' && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5">
              <Check className="h-3 w-3" /> ¡Guardado!
            </span>
          )}
        </div>
      </div>

      {modules.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-[#2a2a2f] rounded-xl bg-slate-900/10">
          <p className="text-xs text-slate-500 italic">No hay públicos configurados todavía. ¡Añade el primero!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, idx) => {
            return (
              <div 
                key={idx}
                className="flex flex-col gap-4 p-5 rounded-xl border border-[#2a2a2f] bg-[#1d1d21]/30 hover:border-slate-800 transition-colors relative group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500 font-sans">PÚBLICO B2B {(idx + 1).toString().padStart(2, '0')}</span>
                    {/* Reorder Buttons */}
                    {!readOnly && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 rounded text-slate-500 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === modules.length - 1}
                          className="p-1 rounded text-slate-500 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveModule(idx)}
                      className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                      title="Quitar este público"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <input 
                    type="text"
                    value={mod.title}
                    onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                    placeholder="Público (ej. Inversores, Socios Minoristas, Proveedores de Materias Primas)"
                    className="w-full bg-slate-900/50 border border-[#2a2a2f] rounded-lg px-3 py-1.5 text-xs text-white font-bold placeholder-slate-600 outline-none focus:border-violet-500 transition-colors disabled:text-slate-400 disabled:border-transparent"
                    disabled={readOnly}
                  />
                  <textarea 
                    value={mod.text}
                    onChange={(e) => handleFieldChange(idx, 'text', e.target.value)}
                    onPaste={(e) => handleMarkdownPaste(e, (val) => handleFieldChange(idx, 'text', val))}
                    placeholder="Descripción de la relación y promesa..."
                    rows={3}
                    className="w-full bg-slate-900/50 border border-[#2a2a2f] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-violet-500 transition-colors resize-none disabled:text-slate-400 disabled:border-transparent"
                    disabled={readOnly}
                  />
                </div>
              </div>
            );
          })}
          {!readOnly && (
            <div className="pt-4 flex justify-center border-t border-[#2a2a2f]/50">
              <button
                onClick={handleAddModule}
                className="flex items-center justify-center gap-2 w-full md:w-auto rounded-xl border border-dashed border-violet-500/30 hover:border-violet-500/60 bg-violet-500/5 hover:bg-violet-500/10 px-8 py-3.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-all cursor-pointer select-none"
              >
                <Plus className="h-4 w-4" />
                <span>Añadir Público B2B</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
