'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { Target, Eye, Award, Sparkles, Check, Plus, Trash2 } from 'lucide-react';

interface ValueItem {
  title: string;
  text: string;
}

export function parseValueProposition(markdown: string): { mission: string; vision: string; values: string } {
  let mission = '';
  let vision = '';
  let values = '';

  const cleanMarkdown = (markdown || '').replace(/\r\n/g, '\n');

  // Matches ### Misión followed by any text until a heading starting with ### or divider --- or end of string
  const missionMatch = cleanMarkdown.match(/### Misión\n([\s\S]*?)(?=(?:###|---|$$))/i);
  if (missionMatch) {
    mission = missionMatch[1].trim();
  }

  const visionMatch = cleanMarkdown.match(/### Visión\n([\s\S]*?)(?=(?:###|---|$$))/i);
  if (visionMatch) {
    vision = visionMatch[1].trim();
  }

  const valuesMatch = cleanMarkdown.match(/### Valores\n([\s\S]*?)(?=(?:###|---|$$))/i);
  if (valuesMatch) {
    values = valuesMatch[1].trim();
  }

  return { mission, vision, values };
}

export function parseValuesList(valuesMarkdown: string): ValueItem[] {
  if (!valuesMarkdown || !valuesMarkdown.trim()) return [];
  
  const lines = valuesMarkdown.split('\n');
  const items: ValueItem[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Matches: 1. **Title**: Text
    const matchBold = trimmed.match(/^(?:\d+\.|\-|\*|\+)\s+\*\*([^*]+?)\*\*\s*[\:\-]?\s*(.*)$/);
    if (matchBold) {
      items.push({
        title: matchBold[1].trim(),
        text: matchBold[2].trim()
      });
    } else {
      // Matches standard list: 1. Title
      const matchPlain = trimmed.match(/^(?:\d+\.|\-|\*|\+)\s+(.+)$/);
      if (matchPlain) {
        items.push({
          title: matchPlain[1].trim(),
          text: ''
        });
      } else {
        items.push({
          title: trimmed,
          text: ''
        });
      }
    }
  }
  
  return items;
}

export function serializeValuesList(items: ValueItem[]): string {
  return items
    .filter(item => item.title && item.title.trim() !== '')
    .map((item, idx) => {
      const title = item.title.trim();
      const text = item.text.trim();
      if (text) {
        return `${idx + 1}. **${title}**: ${text}`;
      } else {
        return `${idx + 1}. **${title}**`;
      }
    })
    .join('\n');
}

export function updateMarkdownValueProposition(
  currentMarkdown: string,
  mission: string,
  vision: string,
  values: string
): string {
  let cleanText = currentMarkdown.replace(/\r\n/g, '\n');
  
  // Remove existing structured sections
  cleanText = cleanText.replace(/### Misión\n[\s\S]*?(?=(### Visión|### Valores|---|$))/gi, '');
  cleanText = cleanText.replace(/### Visión\n[\s\S]*?(?=(### Misión|### Valores|---|$))/gi, '');
  cleanText = cleanText.replace(/### Valores\n[\s\S]*?(?=(### Misión|### Visión|---|$))/gi, '');
  
  cleanText = cleanText.replace(/^---\s*\n?/gi, '').trim();

  const sections = [];
  if (mission.trim()) {
    sections.push(`### Misión\n${mission.trim()}`);
  }
  if (vision.trim()) {
    sections.push(`### Visión\n${vision.trim()}`);
  }
  if (values.trim()) {
    sections.push(`### Valores\n${values.trim()}`);
  }

  if (sections.length === 0) {
    return cleanText;
  }

  return `${sections.join('\n\n')}\n\n---\n\n${cleanText}`;
}

interface ValuePropositionLabProps {
  brandId: string;
  content_md: string;
  onUpdate: () => void;
}

export function ValuePropositionLab({ brandId, content_md, onUpdate }: ValuePropositionLabProps) {
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [valuesList, setValuesList] = useState<ValueItem[]>([{ title: '', text: '' }]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync state with content_md prop when it changes
  useEffect(() => {
    const parsed = parseValueProposition(content_md);
    setMission(parsed.mission);
    setVision(parsed.vision);
    
    // Parse list of values with titles and descriptions
    const list = parseValuesList(parsed.values);
    setValuesList(list.length > 0 ? list : [{ title: '', text: '' }]);
  }, [content_md]);

  const saveToDb = async (m: string, v: string, valList: ValueItem[]) => {
    setSaveState('saving');
    try {
      const valuesMd = serializeValuesList(valList);
      const updatedMarkdown = updateMarkdownValueProposition(content_md, m, v, valuesMd);
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
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-white">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Configurador de Propuesta Diferencial
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Define la Misión, Visión y Valores de la marca. Se sincronizarán automáticamente con el editor superior.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveState === 'saving' && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
              Guardando...
            </span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
              <Check className="h-3.5 w-3.5" />
              Guardado ✓
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            className="w-full h-64 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
            spellCheck={false}
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
            className="w-full h-64 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
            spellCheck={false}
          />
        </div>

        {/* Valores (Numbered List with Title & Description Cards) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white">
            <Award className="h-4 w-4 text-emerald-400" style={{ color: '#36a8e0' }} />
            <label className="text-xs font-bold uppercase tracking-wider">Valores de la Marca</label>
          </div>
          
          <div className="flex-1 flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-lg p-3 h-64">
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[190px]">
              {valuesList.map((item, idx) => (
                <div key={idx} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1.5 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 w-full mr-6">
                      <span className="text-[10px] font-bold font-mono text-slate-500 select-none">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleValueChange(idx, 'title', e.target.value)}
                        placeholder="Título del Valor (ej: Honestidad)"
                        className="bg-transparent border-none p-0 text-xs text-white font-bold placeholder-slate-700 focus:outline-none w-full"
                      />
                    </div>
                    
                    <button
                      onClick={() => handleRemoveValue(idx)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1 absolute right-2 top-2"
                      title="Eliminar valor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  <textarea
                    value={item.text}
                    onChange={(e) => handleValueChange(idx, 'text', e.target.value)}
                    placeholder="Descripción detallada de cómo se aplica este valor..."
                    className="w-full h-14 bg-slate-950 border border-slate-800/60 rounded p-1.5 text-xs text-slate-300 placeholder-slate-700 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
                    spellCheck={false}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleAddValue}
              className="mt-3 flex items-center justify-center gap-1.5 w-full rounded border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-all font-semibold shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir Valor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
