'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { Target, Eye, Award, Sparkles, Check, Plus, Trash2 } from 'lucide-react';

import {
  parseValueProposition,
  parseValuesList,
  serializeValuesList,
  splitBlock2Content,
  compileBlock2Content,
  ValueItem
} from '@/lib/utils/valprop-content';

interface ValuePropositionLabProps {
  brandId: string;
  content_md: string;
  onUpdate: () => void;
  readOnly?: boolean;
}

export function ValuePropositionLab({ brandId, content_md, onUpdate, readOnly = false }: ValuePropositionLabProps) {
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [valuesList, setValuesList] = useState<ValueItem[]>([{ title: '', text: '' }]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync state with content_md prop when it changes
  useEffect(() => {
    const parsed = parseValueProposition(content_md);
    setMission(prev => prev === parsed.mission ? prev : parsed.mission);
    setVision(prev => prev === parsed.vision ? prev : parsed.vision);
    
    // Parse list of values with titles and descriptions
    const list = parseValuesList(parsed.values);
    setValuesList(prev => {
      const isEquivalent = list.length === prev.length && list.every((item, i) => 
        item.title === prev[i]?.title && item.text === prev[i]?.text
      );
      return isEquivalent ? prev : (list.length > 0 ? list : [{ title: '', text: '' }]);
    });
  }, [content_md]);

  const saveToDb = async (m: string, v: string, valList: ValueItem[]) => {
    setSaveState('saving');
    try {
      const valuesMd = serializeValuesList(valList);
      const parsed = splitBlock2Content(content_md);
      const updatedMarkdown = compileBlock2Content({
        rawMarkdown: parsed.rawMarkdown,
        mission: m,
        vision: v,
        values: valuesMd
      });
      await db.updateBrandBlock(brandId, 2, { content_md: updatedMarkdown });
      onUpdate();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('[ValuePropositionLab] Error saving value proposition:', err);
      setSaveState('idle');
    }
  };

  // Handler for text area changes (mission, vision)
  const handleTextChange = (type: 'mission' | 'vision', value: string) => {
    if (readOnly) return;
    let nextMission = mission;
    let nextVision = vision;

    if (type === 'mission') {
      setMission(value);
      nextMission = value;
    } else if (type === 'vision') {
      setVision(value);
      nextVision = value;
    }

    setSaveState('idle');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToDb(nextMission, nextVision, valuesList);
    }, 1500);
  };

  // Handlers for dynamic list of values with title and description
  const handleValueChange = (index: number, field: keyof ValueItem, value: string) => {
    if (readOnly) return;
    const newList = [...valuesList];
    newList[index] = {
      ...newList[index],
      [field]: value
    };
    setValuesList(newList);

    setSaveState('idle');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToDb(mission, vision, newList);
    }, 1500);
  };

  const handlePasteClean = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    index: number,
    field: keyof ValueItem
  ) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    // Replace all returns and newlines with space, and replace multiple spaces with a single space
    const cleaned = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
    
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const value = input.value;
    
    const newValue = value.slice(0, start) + cleaned + value.slice(end);
    handleValueChange(index, field, newValue);
    
    // Reset cursor selection to after the pasted text
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + cleaned.length, start + cleaned.length);
    }, 0);
  };

  const handleBlockEnter = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleAddValue = () => {
    const newList = [...valuesList, { title: '', text: '' }];
    setValuesList(newList);
  };

  const handleRemoveValue = (index: number) => {
    let newList = valuesList.filter((_, idx) => idx !== index);
    if (newList.length === 0) {
      newList = [{ title: '', text: '' }];
    }
    setValuesList(newList);
    
    // Save updated list immediately
    saveToDb(mission, vision, newList);
  };

  // Safe timeout cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-200">
      {/* Subtle save state indicator */}
      <div className="flex justify-end mb-3 h-5">
        {saveState === 'saving' && (
          <span className="text-xs text-slate-400 flex items-center gap-1 select-none animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
            Guardando en tiempo real...
          </span>
        )}
        {saveState === 'saved' && (
          <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold select-none">
            <Check className="h-3.5 w-3.5" />
            Guardado en la marca ✓
          </span>
        )}
      </div>

      {/* Grid of Misión & Visión */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Misión */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white">
            <Target className="h-4 w-4 text-violet-400" />
            <label className="text-xs font-bold uppercase tracking-wider">Misión</label>
          </div>
          <textarea
            value={mission}
            onChange={(e) => handleTextChange('mission', e.target.value)}
            placeholder="¿Cuál es el propósito o razón de ser de la marca?..."
            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
            spellCheck={false}
            disabled={readOnly}
          />
        </div>

        {/* Visión */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white">
            <Eye className="h-4 w-4 text-magenta-400" style={{ color: '#e3599c' }} />
            <label className="text-xs font-bold uppercase tracking-wider">Visión</label>
          </div>
          <textarea
            value={vision}
            onChange={(e) => handleTextChange('vision', e.target.value)}
            placeholder="¿Hacia dónde se dirige la marca a largo plazo?..."
            className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
            spellCheck={false}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Section Divider */}
      <div className="border-t border-slate-800/80 my-6" />

      {/* Valores below (Spanning full width) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-white mb-2">
          <Award className="h-4 w-4 text-emerald-400" style={{ color: '#36a8e0' }} />
          <label className="text-xs font-bold uppercase tracking-wider">Valores de la Marca</label>
        </div>

        <div className="space-y-4">
          {valuesList.map((item, idx) => (
            <div key={idx} className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/80 flex flex-col gap-2.5 relative group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 w-full mr-12">
                  <span className="text-xs font-bold font-mono text-slate-500 select-none">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleValueChange(idx, 'title', e.target.value)}
                    onPaste={(e) => handlePasteClean(e, idx, 'title')}
                    onKeyDown={handleBlockEnter}
                    placeholder="Título del Valor (ej: Honestidad)"
                    className="bg-transparent border-none p-0 text-sm text-white font-bold placeholder-slate-700 focus:outline-none w-full"
                    disabled={readOnly}
                  />
                </div>
                
                {!readOnly && (
                  <button
                    onClick={() => handleRemoveValue(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1.5 absolute right-3 top-3 cursor-pointer"
                    title="Eliminar valor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <textarea
                value={item.text}
                onChange={(e) => handleValueChange(idx, 'text', e.target.value)}
                onPaste={(e) => handlePasteClean(e, idx, 'text')}
                onKeyDown={handleBlockEnter}
                placeholder="Descripción detallada de cómo se aplica este valor en la marca..."
                className="w-full h-20 bg-slate-950 border border-slate-800/60 rounded p-2.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
                spellCheck={false}
                disabled={readOnly}
              />
            </div>
          ))}
        </div>

        {!readOnly && (
          <button
            onClick={handleAddValue}
            className="mt-3 flex items-center justify-center gap-1.5 w-full rounded border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 px-4 py-2.5 text-xs text-slate-400 hover:text-white transition-all font-semibold cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Añadir Valor
          </button>
        )}
      </div>
    </div>
  );
}
