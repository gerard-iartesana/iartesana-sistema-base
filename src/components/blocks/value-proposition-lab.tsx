'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { Target, Eye, Award, Sparkles, Check } from 'lucide-react';

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
  const [values, setValues] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync state with content_md prop when it changes
  useEffect(() => {
    const parsed = parseValueProposition(content_md);
    setMission(parsed.mission);
    setVision(parsed.vision);
    setValues(parsed.values);
  }, [content_md]);

  const saveToDb = async (m: string, v: string, val: string) => {
    setSaveState('saving');
    try {
      const updatedMarkdown = updateMarkdownValueProposition(content_md, m, v, val);
      await db.updateBrandBlock(brandId, 2, { content_md: updatedMarkdown });
      onUpdate();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (err) {
      console.error('[ValuePropositionLab] Error saving value proposition:', err);
      setSaveState('idle');
    }
  };

  // Debounced autosave
  const handleChange = (type: 'mission' | 'vision' | 'values', value: string) => {
    let nextMission = mission;
    let nextVision = vision;
    let nextValues = values;

    if (type === 'mission') {
      setMission(value);
      nextMission = value;
    } else if (type === 'vision') {
      setVision(value);
      nextVision = value;
    } else if (type === 'values') {
      setValues(value);
      nextValues = value;
    }

    setSaveState('idle');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveToDb(nextMission, nextVision, nextValues);
    }, 1500);
  };

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
            onChange={(e) => handleChange('mission', e.target.value)}
            placeholder="¿Cuál es el propósito o razón de ser de la marca?..."
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
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
            onChange={(e) => handleChange('vision', e.target.value)}
            placeholder="¿Hacia dónde se dirige la marca a largo plazo?..."
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
            spellCheck={false}
          />
        </div>

        {/* Valores */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-white">
            <Award className="h-4 w-4 text-emerald-400" style={{ color: '#36a8e0' }} />
            <label className="text-xs font-bold uppercase tracking-wider">Valores</label>
          </div>
          <textarea
            value={values}
            onChange={(e) => handleChange('values', e.target.value)}
            placeholder="¿Qué principios guían el comportamiento de la marca?..."
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none editor-textarea"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
