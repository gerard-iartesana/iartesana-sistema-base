'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { 
  parseSegmentationContent, 
  compileSegmentationContent,
  SegmentationModule 
} from '@/lib/utils/segmentation-content';
import { handleMarkdownPaste } from '@/lib/utils/html-to-markdown';
import { Upload, Trash2, Check, Sparkles, Image, RefreshCw, Plus, ChevronUp, ChevronDown } from 'lucide-react';

interface SegmentationLabProps {
  brandId: string;
  content_md: string;
  onUpdate: () => void;
}

const PRESET_IMAGES = [
  { value: '/images/verbal_voz_escrita.png', label: 'Pluma (Individual)', color: 'text-violet-400' },
  { value: '/images/verbal_idiomas.png', label: 'Globos (Colectivo)', color: 'text-blue-400' },
  { value: '/images/verbal_glosario_usamos.png', label: 'Destellos (Estilo)', color: 'text-emerald-400' },
  { value: '/images/verbal_glosario_evitar.png', label: 'Escudo (Protección)', color: 'text-red-400' },
];

export function SegmentationLab({ brandId, content_md, onUpdate }: SegmentationLabProps) {
  const { introMarkdown, modules: initialModules } = parseSegmentationContent(content_md);
  const [modules, setModules] = useState<SegmentationModule[]>(initialModules);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const handleGenerateAIImage = async (index: number) => {
    const mod = modules[index];
    if (!mod.title.trim()) {
      alert('Por favor, escribe un título para el público primero.');
      return;
    }
    
    setGeneratingIndex(index);
    setSavingState('saving');
    
    try {
      const prompt = `extremely simple minimalist line art icon, vector style, flat black stroke on pure white background, no gradients, no shading, no colors, clean outline, topic: ${mod.title} - ${mod.text.slice(0, 100)}`;
      const seed = Math.floor(Math.random() * 99999999);
      
      const localModel = typeof window !== 'undefined' ? localStorage.getItem('pollinations_model') || 'flux' : 'flux';
      const localApiKey = typeof window !== 'undefined' ? localStorage.getItem('pollinations_api_key') || '' : '';

      let url = '';
      if (localModel === 'nanobanana') {
        if (!localApiKey.trim()) {
          alert('Para usar el modelo Nanobanana, por favor introduce tu Clave API de Pollinations en la configuración global (botón en la esquina inferior izquierda del menú).');
          setGeneratingIndex(null);
          setSavingState('idle');
          return;
        }
        url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&private=true&enhance=false&seed=${seed}&model=nanobanana&key=${encodeURIComponent(localApiKey.trim())}`;
      } else {
        url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&private=true&enhance=false&seed=${seed}&model=flux`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: La Clave API es incorrecta o inválida.');
        }
        throw new Error(`Network response was not ok, status: ${response.status}`);
      }
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const updated = [...modules];
        updated[index] = { ...updated[index], image: base64 };
        setModules(updated);
        await saveModules(updated);
        setGeneratingIndex(null);
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      console.error('[SegmentationLab] AI Generation failed:', err);
      alert(err.message || 'No se pudo generar la imagen con IA. Inténtalo de nuevo.');
      setGeneratingIndex(null);
      setSavingState('idle');
    }
  };

  const saveModules = async (updatedModules: SegmentationModule[]) => {
    setSavingState('saving');
    try {
      const compiled = compileSegmentationContent(introMarkdown, updatedModules);
      await db.updateBrandBlock(brandId, 8, {
        content_md: compiled,
      });
      setSavingState('saved');
      onUpdate();
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
      console.error('[SegmentationLab] Failed to save modules:', err);
      setSavingState('idle');
    }
  };

  const handleFieldChange = (index: number, field: keyof SegmentationModule, value: string) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], [field]: value };
    setModules(updated);
    saveModules(updated);
  };

  const handleSelectPreset = (index: number, presetUrl: string) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], image: presetUrl };
    setModules(updated);
    saveModules(updated);
  };

  const triggerFileUpload = (index: number) => {
    setActiveModuleIndex(index);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeModuleIndex === null) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const updated = [...modules];
      updated[activeModuleIndex] = { ...updated[activeModuleIndex], image: base64 };
      setModules(updated);
      await saveModules(updated);
      setActiveModuleIndex(null);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleAddModule = () => {
    const newMod: SegmentationModule = {
      title: 'Nuevo Público',
      text: 'Describe aquí el comportamiento, valores y perfil de este segmento de público.',
      image: '/images/verbal_voz_escrita.png'
    };
    const updated = [...modules, newMod];
    setModules(updated);
    saveModules(updated);
  };

  const handleRemoveModule = (index: number) => {
    if (!confirm('¿Estás seguro de que deseas quitar este público?')) return;
    const updated = modules.filter((_, i) => i !== index);
    setModules(updated);
    saveModules(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...modules];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setModules(updated);
    saveModules(updated);
  };

  const handleMoveDown = (index: number) => {
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
            <Image className="h-4.5 w-4.5 text-violet-400" />
            Configurador de Segmentación No-Demográfica
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Añade públicos módulo a módulo con su título, descripción e iconografía personalizada.
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



      {/* Hidden file uploader */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {modules.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-[#2a2a2f] rounded-xl bg-slate-900/10">
          <p className="text-xs text-slate-500 italic">No hay públicos configurados todavía. ¡Añade el primero!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {modules.map((mod, idx) => {
            const isCustom = mod.image?.startsWith('data:image');
            return (
              <div 
                key={idx}
                className="flex flex-col md:flex-row gap-5 p-5 rounded-xl border border-[#2a2a2f] bg-[#1d1d21]/30 hover:border-slate-800 transition-colors relative group"
              >
                {/* Image Preview / Selector */}
                <div className="w-full md:w-[130px] aspect-square rounded-lg border border-[#2a2a2f] flex items-center justify-center p-2 relative overflow-hidden shrink-0 bg-white">
                  {mod.image ? (
                    <img 
                      src={mod.image} 
                      alt={mod.title} 
                      className="max-h-full max-w-full object-contain" 
                    />
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Sin icono</span>
                  )}
                </div>

                {/* Content Inputs */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">PÚBLICO {(idx + 1).toString().padStart(2, '0')}</span>
                        {/* Sort Reorder Buttons */}
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
                      </div>
                      <button
                        onClick={() => handleRemoveModule(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Quitar este público"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input 
                        type="text"
                        value={mod.title}
                        onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                        placeholder="Título del público (ej. Clientes Jóvenes, Directivos B2B)"
                        className="w-full bg-slate-900/50 border border-[#2a2a2f] rounded-lg px-3 py-1.5 text-xs text-white font-bold placeholder-slate-600 outline-none focus:border-violet-500 transition-colors"
                      />
                      <textarea 
                        value={mod.text}
                        onChange={(e) => handleFieldChange(idx, 'text', e.target.value)}
                        onPaste={(e) => handleMarkdownPaste(e, (val) => handleFieldChange(idx, 'text', val))}
                        placeholder="Texto descriptivo..."
                        rows={3}
                        className="w-full bg-slate-900/50 border border-[#2a2a2f] rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-violet-500 transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Icon Presets & Upload Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-[#0f0f11] rounded-lg border border-[#2a2a2f] p-1 select-none">
                      {PRESET_IMAGES.map((preset) => {
                        const isSelected = mod.image === preset.value;
                        return (
                          <button
                            key={preset.value}
                            onClick={() => handleSelectPreset(idx, preset.value)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-slate-850 text-white font-black' 
                                : 'text-slate-500 hover:text-slate-350'
                            }`}
                          >
                            <span className={`${preset.color} mr-1`}>●</span>
                            {preset.label.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => triggerFileUpload(idx)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                        isCustom 
                          ? 'border-violet-500/30 bg-violet-500/5 text-violet-400' 
                          : 'border-[#2a2a2f] bg-[#0f0f11] text-slate-400 hover:border-slate-800 hover:bg-[#17171a]'
                      }`}
                    >
                      <Upload size={12} />
                      <span>{isCustom ? 'Personalizada (Cambiar)' : 'Subir Icono'}</span>
                    </button>

                    <button
                      onClick={() => handleGenerateAIImage(idx)}
                      disabled={generatingIndex === idx}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                        generatingIndex === idx
                          ? 'border-violet-500 bg-violet-650 text-white animate-pulse'
                          : 'border-[#2a2a2f] bg-[#0f0f11] text-violet-400 hover:border-slate-800 hover:bg-[#17171a]'
                      }`}
                    >
                      {generatingIndex === idx ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Generando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Generar con IA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="pt-4 flex justify-center border-t border-[#2a2a2f]/50">
            <button
              onClick={handleAddModule}
              className="flex items-center justify-center gap-2 w-full md:w-auto rounded-xl border border-dashed border-violet-500/30 hover:border-violet-500/60 bg-violet-500/5 hover:bg-violet-500/10 px-8 py-3.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-all cursor-pointer select-none"
            >
              <Plus className="h-4 w-4" />
              <span>Añadir Público de Segmentación</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
