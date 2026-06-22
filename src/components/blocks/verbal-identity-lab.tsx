'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { 
  parseVerbalIdentity, 
  splitBlock6Content, 
  compileBlock6Content 
} from '@/lib/utils/verbal-content';
import { Upload, Trash2, Check, Sparkles, Image, RefreshCw, HelpCircle } from 'lucide-react';

interface VerbalIdentityLabProps {
  brandId: string;
  content_md: string;
  onUpdate: () => void;
}

const PRESET_IMAGES = [
  { value: '/images/verbal_voz_escrita.png', label: 'Voz Escrita (Pluma)', color: 'text-violet-400' },
  { value: '/images/verbal_idiomas.png', label: 'Idiomas y Tuteo (Globos)', color: 'text-blue-400' },
  { value: '/images/verbal_glosario_usamos.png', label: 'Glosario Sí (Destellos)', color: 'text-emerald-400' },
  { value: '/images/verbal_glosario_evitar.png', label: 'Glosario No (Escudo)', color: 'text-red-400' },
];

export function VerbalIdentityLab({ brandId, content_md, onUpdate }: VerbalIdentityLabProps) {
  const { rawMarkdown, images: initialImages } = splitBlock6Content(content_md);
  const sections = parseVerbalIdentity(rawMarkdown);
  
  const [images, setImages] = useState<Record<string, string>>(initialImages);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSectionKey, setActiveSectionKey] = useState<string | null>(null);

  const saveImages = async (newImages: Record<string, string>) => {
    setSavingState('saving');
    try {
      const compiled = compileBlock6Content(rawMarkdown, newImages);
      await db.updateBrandBlock(brandId, 6, {
        content_md: compiled,
      });
      setSavingState('saved');
      onUpdate();
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
      console.error('[VerbalIdentityLab] Failed to save images:', err);
      setSavingState('idle');
    }
  };

  const handleSelectPreset = async (sectionKey: string, presetUrl: string) => {
    const updated = { ...images, [sectionKey]: presetUrl };
    setImages(updated);
    await saveImages(updated);
  };

  const handleRemoveImage = async (sectionKey: string) => {
    const updated = { ...images };
    delete updated[sectionKey];
    setImages(updated);
    await saveImages(updated);
  };

  const triggerFileUpload = (sectionKey: string) => {
    setActiveSectionKey(sectionKey);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSectionKey) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const updated = { ...images, [activeSectionKey]: base64 };
      setImages(updated);
      await saveImages(updated);
      setActiveSectionKey(null);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  if (sections.length === 0) {
    return (
      <div className="bg-[#17171a] rounded-2xl border border-[#2a2a2f] p-8 text-center">
        <HelpCircle className="mx-auto h-12 w-12 text-slate-500 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">Bloque vacío</h3>
        <p className="text-xs text-slate-450 max-w-sm mx-auto">
          Primero escribe y organiza el contenido en secciones usando títulos (`##`) en el editor superior para poder configurar sus imágenes de apoyo.
        </p>
      </div>
    );
  }

  const getSectionKey = (section: any) => {
    return section.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const getActiveImage = (section: any) => {
    const key = getSectionKey(section);
    const defaultImageMap: Record<string, string> = {
      voz_escrita: '/images/verbal_voz_escrita.png',
      tuteo: '/images/verbal_idiomas.png',
      usamos: '/images/verbal_glosario_usamos.png',
      evitar: '/images/verbal_glosario_evitar.png',
    };
    return images[key] || images[section.type] || defaultImageMap[section.type] || '';
  };

  return (
    <div className="bg-[#17171a] rounded-2xl border border-[#2a2a2f] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a2f] pb-4 select-none">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Image className="h-4.5 w-4.5 text-violet-400" />
            Configurador de Imágenes de Apoyo
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Asigna ilustraciones minimalistas personalizadas o presets a cada sección para el modo presentación.
          </p>
        </div>
        <div>
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

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 gap-6">
        {sections.map((section, idx) => {
          const sectionKey = getSectionKey(section);
          const activeImage = getActiveImage(section);
          const isCustom = activeImage.startsWith('data:image');
          const isMappedToDefault = !images[sectionKey] && !images[section.type];

          return (
            <div 
              key={idx} 
              className="flex flex-col md:flex-row gap-5 p-5 rounded-xl border border-[#2a2a2f] bg-[#1d1d21]/30 hover:border-slate-800 transition-colors"
            >
              {/* Image Preview Area */}
              <div className="w-full md:w-[130px] aspect-square rounded-lg border border-[#2a2a2f] flex items-center justify-center p-2 relative group overflow-hidden shrink-0" style={{ backgroundColor: '#ffffff' }}>
                {activeImage ? (
                  <img 
                    src={activeImage} 
                    alt={section.title} 
                    className="max-h-full max-w-full object-contain" 
                  />
                ) : (
                  <span className="text-[10px] text-slate-500 italic">Sin imagen</span>
                )}
                {activeImage && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                    <button
                      onClick={() => handleRemoveImage(sectionKey)}
                      className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                      title="Eliminar mapeo de imagen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Controls and Title */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 select-none">
                    <span className="text-xs font-mono font-bold text-slate-500">SECCIÓN {(idx + 1).toString().padStart(2, '0')}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {section.type}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2 leading-snug">{section.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans mb-4">
                    {section.content || 'Sin descripción o elementos en esta sección.'}
                  </p>
                </div>

                {/* Buttons controls */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Select Presets */}
                  <div className="flex items-center gap-1.5 bg-[#0f0f11] rounded-lg border border-[#2a2a2f] p-1">
                    {PRESET_IMAGES.map((preset) => {
                      const isSelected = images[sectionKey] === preset.value || (!images[sectionKey] && section.type === 'general' && false) || (!images[sectionKey] && activeImage === preset.value);
                      return (
                        <button
                          key={preset.value}
                          onClick={() => handleSelectPreset(sectionKey, preset.value)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-slate-850 text-white font-black' 
                              : 'text-slate-500 hover:text-slate-350'
                          }`}
                          title={`Usar preset ${preset.label}`}
                        >
                          <span className={`${preset.color} mr-1 font-bold`}>●</span>
                          {preset.label.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Upload custom image */}
                  <button
                    onClick={() => triggerFileUpload(sectionKey)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
                      isCustom 
                        ? 'border-violet-500/30 bg-violet-500/5 text-violet-400' 
                        : 'border-[#2a2a2f] bg-[#0f0f11] text-slate-400 hover:border-slate-800 hover:bg-[#17171a]'
                    }`}
                  >
                    <Upload size={12} />
                    <span>{isCustom ? 'Personalizada (Cambiar)' : 'Subir Imagen'}</span>
                  </button>

                  {/* Reset indicators */}
                  {!isMappedToDefault && (
                    <button
                      onClick={() => handleRemoveImage(sectionKey)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-350 cursor-pointer flex items-center gap-1 py-1"
                      title="Volver a la imagen predeterminada por tipo"
                    >
                      <Trash2 size={11} />
                      <span>Quitar</span>
                    </button>
                  )}

                  {isMappedToDefault && (
                    <span className="text-[9px] font-bold font-mono text-slate-500 select-none">
                      Predeterminada
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
