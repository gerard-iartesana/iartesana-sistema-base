'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { Sparkles, Trash2, Info } from 'lucide-react';
import type { BrandBlock } from '@/lib/db/types';

// Definition of the 12 Archetypes according to the iARTESANA brand wheel
export const ARCHETYPES = [
  { name: 'La Visionaria', category: 'CAMBIO', description: 'Visión para transformar lo corriente en extraordinario', icon: 'rocket', angleStart: 0, angleEnd: 30 },
  { name: 'La Comprometida', category: 'COLECTIVIDAD', description: 'Compromiso para afrontar causas justas', icon: 'sun', angleStart: 30, angleEnd: 60 },
  { name: 'La Humana', category: 'COLECTIVIDAD', description: 'Pertenencia y unión para que conectes con grupos', icon: 'footprints', angleStart: 60, angleEnd: 90 },
  { name: 'La Sabia', category: 'COLECTIVIDAD', description: 'Conocimiento para obtener soluciones y respuestas', icon: 'atom', angleStart: 90, angleEnd: 120 },
  { name: 'La Maestra', category: 'ESTABILIDAD', description: 'Maestría para exponer tu experiencia y saber hacer', icon: 'knight', angleStart: 120, angleEnd: 150 },
  { name: 'La Gobernadora', category: 'ESTABILIDAD', description: 'Liderazgo y control para crear orden', icon: 'crown', angleStart: 150, angleEnd: 180 },
  { name: 'La Protectora', category: 'ESTABILIDAD', description: 'Cuidado y protección de los demás', icon: 'shield', angleStart: 180, angleEnd: 210 },
  { name: 'La Hedonista', category: 'INDIVIDUALISMO', description: 'Placer para disfrutar y deleitarte con la vida', icon: 'heart', angleStart: 210, angleEnd: 240 },
  { name: 'La Juguetona', category: 'INDIVIDUALISMO', description: 'Diversión para que pases un buen rato con alegría', icon: 'smiley', angleStart: 240, angleEnd: 270 },
  { name: 'La Liberadora', category: 'INDIVIDUALISMO', description: 'Liberación para ser quien tú quieras', icon: 'butterfly', angleStart: 270, angleEnd: 300 },
  { name: 'La Heroína', category: 'INDIVIDUALISMO', description: 'Valor, fuerza y poder para transformarte', icon: 'star-shield', angleStart: 300, angleEnd: 330 },
  { name: 'La Radical', category: 'CAMBIO', description: 'Rebeldía para romper con lo establecido', icon: 'lightning', angleStart: 330, angleEnd: 360 },
];

export const CATEGORY_COLORS: Record<string, string> = {
  'CAMBIO': '#7361a8',       // Morado
  'COLECTIVIDAD': '#36a8e0', // Azul
  'ESTABILIDAD': '#85bf57',   // Verde
  'INDIVIDUALISMO': '#e3599c' // Magenta
};

// Inline SVG paths for the 12 icons (each centered in a 24x24 box)
export const ICON_PATHS: Record<string, React.ReactNode> = {
  rocket: (
    <>
      <path d="M12 2s-5 4.5-5 10c0 1.5.5 3 1.5 4L7 18.5V21l2.5-1 2.5-2.5c1 .5 2 .5 3 0l2.5 2.5 2.5 1V18.5l-1.5-2.5c1-1 1.5-2.5 1.5-4 0-5.5-5-10-5-10z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5L19 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  footprints: (
    <>
      <path d="M8.5 14c0-1 1-1.8 1.8-1.8s1.8.8 1.8 1.8c0 1.5-1 2.5-1.8 2.5s-1.8-1-1.8-2.5zm6-3c0-1 1-1.8 1.8-1.8s1.8.8 1.8 1.8c0 1.5-1 2.5-1.8 2.5s-1.8-1-1.8-2.5z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="10.3" cy="10.5" r="0.6" fill="currentColor" />
      <circle cx="11.5" cy="10" r="0.6" fill="currentColor" />
      <circle cx="15.8" cy="8.2" r="0.6" fill="currentColor" />
      <circle cx="17" cy="7.7" r="0.6" fill="currentColor" />
    </>
  ),
  atom: (
    <>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(30 12 12)" />
      <ellipse cx="12" cy="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(-30 12 12)" />
      <ellipse cx="12" cy="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" transform="rotate(90 12 12)" />
    </>
  ),
  knight: (
    <path d="M16 20c0-2-1-4.5-2-6l-1.5-2c0-1.5.5-2 1-3.5 0-1.5-1.5-2-2.5-1.5-.7 0-1.2.7-1.5 1.5L9 12c-1.5 1-2 2-2 3.5h2.5c.8 0 1.5.8 1.5 1.5v3h5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  crown: (
    <>
      <path d="M3 16l1.5-7 4 3.5L12 8l3.5 4.5 4-3.5 1.5 7H3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  shield: (
    <path d="M12 3s7 1.8 7 7.5c0 5-4.5 8.7-7 10.5-2.5-1.8-7-5.5-7-10.5C5 4.8 12 3 12 3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  heart: (
    <path d="M12 20.3l-1.3-1.2C6 14.8 3 12 3 8.6 3 5.8 5.2 3.6 8 3.6c1.6 0 3.1.7 4 1.9.9-1.2 2.4-1.9 4-1.9 2.8 0 5 2.2 5 5 0 3.4-3 6.2-7.7 10.5L12 20.3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  smiley: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="9.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1" fill="currentColor" />
      <path d="M8 14c1.5 2 4.5 2 6 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  butterfly: (
    <path d="M12 3v17 M12 7c-1.5-2.5-5-2.5-6 .8s2.5 5 6 2.2 M12 7c1.5-2.5 5-2.5 6 .8s-2.5 5-6 2.2 M12 12.5c-1.5-1-4 .8-4 3.3s2.5 2.5 4 0 M12 12.5c1.5-1 4 .8 4 3.3s-2.5 2.5-4 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'star-shield': (
    <>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <polygon points="12,7.5 13.3,11 16.8,11 14,13 15.1,16.5 12,14.5 8.9,16.5 10,13 7.2,11 10.7,11" fill="currentColor" />
    </>
  ),
  lightning: (
    <polygon points="13,3 5,12 11.5,12 11,21 19,12 12.5,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

function normalizeArchetypeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^(la|el)\s+/, '')
    .trim();
}

export function parseArchetypes(markdown: string): Record<string, number> {
  const archetypes: Record<string, number> = {};
  const regex = /\*\*([^*]+?)\*\*\s*[\:\-]?\s*(\d+)\s*%/gi;
  let match;
  const cleanMarkdown = (markdown || '').replace(/\r\n/g, '\n');
  console.log('[parseArchetypes] Input markdown:', JSON.stringify(cleanMarkdown));
  while ((match = regex.exec(cleanMarkdown)) !== null) {
    const name = match[1].trim();
    const value = parseInt(match[2], 10);
    const normalizedMatchName = normalizeArchetypeName(name);
    const def = ARCHETYPES.find(a => normalizeArchetypeName(a.name) === normalizedMatchName);
    console.log('[parseArchetypes] Match:', { name, value, normalizedMatchName, matchedDef: def?.name });
    if (def) {
      archetypes[def.name] = value;
    }
  }
  console.log('[parseArchetypes] Result:', archetypes);
  return archetypes;
}

export function updateMarkdownArchetypes(currentMarkdown: string, selectedArchetypes: Record<string, number>): string {
  // Matches list items with percentage e.g. * **La Comprometida**: 60%
  const archetypeRegex = /^(?:[\*\-]\s*)?\*\*(La\s+[^*]+?)\*\*\:\s*\d+\s*%\s*\n?/gim;
  let cleanText = currentMarkdown.replace(archetypeRegex, '').trim();

  // Remove structural dividers and headers we generated previously
  cleanText = cleanText.replace(/^### Arquetipos Seleccionados\s*\n?/gi, '').trim();
  cleanText = cleanText.replace(/^---\s*\n?/gi, '').trim();

  const lines = Object.entries(selectedArchetypes)
    .filter(([_, pct]) => pct > 0)
    .map(([name, pct]) => `* **${name}**: ${pct}%`);

  if (lines.length === 0) {
    return cleanText;
  }

  return `### Arquetipos Seleccionados\n${lines.join('\n')}\n\n---\n\n${cleanText}`;
}

interface ArchetypeLabProps {
  brandId: string;
  onUpdate: () => void;
}

export function ArchetypeLab({ brandId, onUpdate }: ArchetypeLabProps) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [rawContent, setRawContent] = useState('');
  const [activeTab, setActiveTab] = useState<'wheel' | 'list'>('wheel');
  const savingRef = useRef(false);

  // Load block content on mount and when brandId changes
  useEffect(() => {
    async function loadData() {
      const blocks = await db.getBrandBlocks(brandId);
      const block = blocks.find(b => b.block_id === 4);
      if (block) {
        setRawContent(block.content_md || '');
        const parsed = parseArchetypes(block.content_md || '');
        setSelected(parsed);
      }
    }
    loadData();
  }, [brandId]);

  const saveToDb = async (newSelected: Record<string, number>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const updatedMarkdown = updateMarkdownArchetypes(rawContent, newSelected);
      setRawContent(updatedMarkdown);
      await db.updateBrandBlock(brandId, 4, { content_md: updatedMarkdown });
      onUpdate();
    } catch (err) {
      console.error('[ArchetypeLab] Error saving archetypes:', err);
    } finally {
      savingRef.current = false;
    }
  };

  const handleToggleArchetype = (name: string) => {
    const newSelected = { ...selected };
    if (newSelected[name] !== undefined) {
      delete newSelected[name];
    } else {
      // Limit to max 4 archetypes for clean presentation, default 50%
      if (Object.keys(newSelected).length >= 4) return;
      newSelected[name] = 50;
    }
    setSelected(newSelected);
    saveToDb(newSelected);
  };

  const handlePercentageChange = (name: string, value: number) => {
    const newSelected = { ...selected, [name]: value };
    setSelected(newSelected);
    // Debounce or save immediately on change (HTML range input handles updates)
    saveToDb(newSelected);
  };

  const handleRemoveArchetype = (name: string) => {
    const newSelected = { ...selected };
    delete newSelected[name];
    setSelected(newSelected);
    saveToDb(newSelected);
  };

  const handleClearAll = () => {
    setSelected({});
    saveToDb({});
  };

  // SVG parameters
  const cx = 250;
  const cy = 250;
  const r = 180;
  const iconR = 120;
  const textR = 215;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-white">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Configurador de Arquetipos
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Selecciona hasta 4 arquetipos de marca en la rueda y ajusta sus porcentajes.
          </p>
        </div>
        <div className="flex gap-2">
          {Object.keys(selected).length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpiar Rueda
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: The Interactive SVG Wheel */}
        <div className="lg:col-span-7 flex justify-center">
          <svg viewBox="0 0 500 500" className="w-full max-w-[420px] h-auto select-none">
            {/* Outer Category Labels */}
            <text x={cx} y={cy - r - 25} textAnchor="middle" className="text-[8px] font-bold tracking-widest fill-slate-600 opacity-55 uppercase">Cambio</text>
            <text x={cx} y={cy + r + 32} textAnchor="middle" className="text-[8px] font-bold tracking-widest fill-slate-600 opacity-55 uppercase">Estabilidad</text>
            
            <text
              x={cx + r + 25}
              y={cy}
              textAnchor="middle"
              className="text-[8px] font-bold tracking-widest fill-slate-600 opacity-55 uppercase"
              transform={`rotate(90, ${cx + r + 25}, ${cy})`}
            >
              Colectividad
            </text>
            <text
              x={cx - r - 25}
              y={cy}
              textAnchor="middle"
              className="text-[8px] font-bold tracking-widest fill-slate-600 opacity-55 uppercase"
              transform={`rotate(-90, ${cx - r - 25}, ${cy})`}
            >
              Individualismo
            </text>

            {/* Render the 12 sectors */}
            {ARCHETYPES.map((arc, i) => {
              const startAngle = ((arc.angleStart - 90) * Math.PI) / 180;
              const endAngle = ((arc.angleEnd - 90) * Math.PI) / 180;
              const midAngle = startAngle + (endAngle - startAngle) / 2;

              // Arc coordinates
              const x1 = cx + r * Math.cos(startAngle);
              const y1 = cy + r * Math.sin(startAngle);
              const x2 = cx + r * Math.cos(endAngle);
              const y2 = cy + r * Math.sin(endAngle);

              const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

              // Icon coordinates
              const ix = cx + iconR * Math.cos(midAngle);
              const iy = cy + iconR * Math.sin(midAngle);

              // Text label coordinates
              const tx = cx + textR * Math.cos(midAngle);
              const ty = cy + textR * Math.sin(midAngle);

              // Determine text anchor
              let textAnchor: 'inherit' | 'end' | 'middle' | 'start' = 'middle';
              const cosValue = Math.cos(midAngle);
              if (cosValue > 0.2) textAnchor = 'start';
              else if (cosValue < -0.2) textAnchor = 'end';

              const isSelected = selected[arc.name] !== undefined;
              const percentage = selected[arc.name] || 0;
              const catColor = CATEGORY_COLORS[arc.category];

              return (
                <g key={arc.name} className="group cursor-pointer" onClick={() => handleToggleArchetype(arc.name)}>
                  {/* Slice Path */}
                  <path
                    d={pathData}
                    fill={isSelected ? catColor : '#1d1d21'}
                    fillOpacity={isSelected ? 0.2 + 0.8 * (percentage / 100) : 0.6}
                    stroke="#0f0f11"
                    strokeWidth="2.5"
                    className="transition-all duration-300 group-hover:fill-slate-800 group-hover:fill-opacity-80"
                  />

                  {/* Icon */}
                  <g
                    transform={`translate(${ix - 12}, ${iy - 12})`}
                    className={`transition-colors duration-300 pointer-events-none ${
                      isSelected ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    {ICON_PATHS[arc.icon]}
                  </g>

                  {/* Micro label (Radial/Visionaria etc.) */}
                  <text
                    x={tx}
                    y={ty}
                    textAnchor={textAnchor}
                    className={`transition-all duration-300 pointer-events-none ${
                      isSelected 
                        ? 'text-[10.5px] font-black fill-white' 
                        : 'text-[8.5px] font-semibold fill-slate-500 group-hover:fill-slate-300'
                    }`}
                  >
                    <tspan x={tx} dy="0">
                      {arc.name.replace('La ', '').toUpperCase()}
                    </tspan>
                    {isSelected && (
                      <tspan x={tx} dy="11" fill={catColor} className="font-mono font-bold text-[9.5px]">
                        {percentage}%
                      </tspan>
                    )}
                  </text>
                </g>
              );
            })}

            {/* Inner center hollow ring for aesthetics */}
            <circle cx={cx} cy={cy} r="25" fill="#0f0f11" stroke="#2a2a2f" strokeWidth="1" />
          </svg>
        </div>

        {/* Right: Sliders and selection details */}
        <div className="lg:col-span-5 flex flex-col justify-center h-full">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-slate-500" />
            Porcentajes de la Marca
          </h4>

          {Object.keys(selected).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/50 text-center">
              <p className="text-xs text-slate-500 max-w-[240px]">
                Haz clic directamente en las secciones de la rueda para iluminar tus arquetipos primarios y secundarios.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(selected).map(([name, pct]) => {
                const arc = ARCHETYPES.find(a => a.name === name);
                if (!arc) return null;
                const catColor = CATEGORY_COLORS[arc.category];

                return (
                  <div key={name} className="border border-slate-800 rounded-lg p-3 bg-slate-900/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: catColor }}
                        />
                        <span className="text-xs font-bold text-white">{name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold uppercase">
                          {arc.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white" style={{ color: catColor }}>
                          {pct}%
                        </span>
                        <button
                          onClick={() => handleRemoveArchetype(name)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                          title="Quitar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal mb-3">
                      {arc.description}
                    </p>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-medium">10%</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={pct}
                        onChange={(e) => handlePercentageChange(name, parseInt(e.target.value, 10))}
                        className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                        style={{
                          accentColor: catColor,
                          backgroundImage: `linear-gradient(to right, ${catColor} ${pct}%, #1e293b ${pct}%)`
                        }}
                      />
                      <span className="text-[10px] text-slate-500 font-medium">100%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
