'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Sparkles, MessageSquare, Users, Shield } from 'lucide-react';

const stageIcons: Record<string, React.ComponentType<any>> = {
  'A': Sparkles,
  'B': MessageSquare,
  'C': Users,
  'D': Shield,
};
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import { BLOCK_DEFINITIONS, STAGES } from '@/lib/data/block-definitions';
import type { BrandBlock } from '@/lib/db/types';
import ReactMarkdown from 'react-markdown';
import { ARCHETYPES, CATEGORY_COLORS, ICON_PATHS, parseArchetypes } from '@/components/blocks/archetype-lab';

function extractText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return children.toString();
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (React.isValidElement(children)) {
    return extractText((children.props as any)?.children);
  }
  return '';
}

const HeadingRenderer = ({ level, children, ...props }: any) => {
  const text = extractText(children);
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let iconSrc = '';
  if (/\b(mision)\b/i.test(normalized)) {
    iconSrc = '/images/icono-mision.svg';
  } else if (/\b(vision)\b/i.test(normalized)) {
    iconSrc = '/images/icono-vision.svg';
  } else if (/\b(valores)\b/i.test(normalized)) {
    iconSrc = '/images/icono-valores.svg';
  }

  const Tag = `h${level}` as any;

  if (iconSrc) {
    return (
      <div className="flex flex-col items-start gap-2.5 mt-6 mb-4 select-none">
        <img
          src={iconSrc}
          alt={text}
          className="w-12 h-12 opacity-50 object-contain"
        />
        <Tag {...props} className="!m-0">
          {children}
        </Tag>
      </div>
    );
  }

  return <Tag {...props}>{children}</Tag>;
};

interface SectionMatch {
  iconSrc: string;
  sectionTitle: string;
  cleanedChildren: React.ReactNode[];
}

function matchSection(children: React.ReactNode): SectionMatch | null {
  const childrenArray = React.Children.toArray(children);
  if (childrenArray.length === 0) return null;

  const firstChild = childrenArray[0];
  let iconSrc = '';
  let sectionTitle = '';
  let restOfChildren = childrenArray;

  // Case 1: First child is a <strong> element
  if (
    React.isValidElement(firstChild) &&
    (firstChild.type === 'strong' ||
      (firstChild.type as any)?.name === 'strong' ||
      (firstChild.props as any)?.className?.includes('strong'))
  ) {
    const strongText = extractText((firstChild.props as any).children).trim();
    const normalized = strongText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/\b(mision)\b/i.test(normalized)) {
      iconSrc = '/images/icono-mision.svg';
      sectionTitle = 'Misión';
      restOfChildren = childrenArray.slice(1);
    } else if (/\b(vision)\b/i.test(normalized)) {
      iconSrc = '/images/icono-vision.svg';
      sectionTitle = 'Visión';
      restOfChildren = childrenArray.slice(1);
    } else if (/\b(valores)\b/i.test(normalized)) {
      iconSrc = '/images/icono-valores.svg';
      sectionTitle = 'Valores';
      restOfChildren = childrenArray.slice(1);
    }
  }
  // Case 2: First child is a plain text string
  else if (typeof firstChild === 'string') {
    const text = firstChild.trim();
    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/\b(mision)\b/i.test(normalized)) {
      iconSrc = '/images/icono-mision.svg';
      sectionTitle = 'Misión';
      const cleanedText = text.replace(/^[Mm]isi[oó]n\b[\s\.:\-]*/, '');
      restOfChildren = [cleanedText, ...childrenArray.slice(1)];
    } else if (/\b(vision)\b/i.test(normalized)) {
      iconSrc = '/images/icono-vision.svg';
      sectionTitle = 'Visión';
      const cleanedText = text.replace(/^[Vv]isi[oó]n\b[\s\.:\-]*/, '');
      restOfChildren = [cleanedText, ...childrenArray.slice(1)];
    } else if (/\b(valores)\b/i.test(normalized)) {
      iconSrc = '/images/icono-valores.svg';
      sectionTitle = 'Valores';
      const cleanedText = text.replace(/^[Vv]alores\b[\s\.:\-]*/, '');
      restOfChildren = [cleanedText, ...childrenArray.slice(1)];
    }
  }

  if (iconSrc) {
    // Clean up any leading dot, colon, or space from the remaining content
    const cleaned = [...restOfChildren];
    if (cleaned.length > 0 && typeof cleaned[0] === 'string') {
      cleaned[0] = cleaned[0].replace(/^[\s\.\:\-]*/, '');
    }
    return {
      iconSrc,
      sectionTitle,
      cleanedChildren: cleaned,
    };
  }

  return null;
}

const ParagraphRenderer = ({ children, ...props }: any) => {
  const match = matchSection(children);
  if (match) {
    return (
      <div className="mt-8 mb-6 first:mt-4">
        <div className="flex items-center gap-3 mb-2.5 select-none">
          <img
            src={match.iconSrc}
            alt={match.sectionTitle}
            className="w-10 h-10 opacity-50 object-contain shrink-0"
          />
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            {match.sectionTitle}
          </span>
        </div>
        <p className="text-base leading-relaxed pl-[52px] text-slate-300 m-0">
          {match.cleanedChildren}
        </p>
      </div>
    );
  }
  return <p {...props}>{children}</p>;
};

const LiRenderer = ({ children, ...props }: any) => {
  const match = matchSection(children);
  if (match) {
    return (
      <li className="list-none mt-8 mb-6 first:mt-4">
        <div className="flex items-center gap-3 mb-2.5 select-none">
          <img
            src={match.iconSrc}
            alt={match.sectionTitle}
            className="w-10 h-10 opacity-50 object-contain shrink-0"
          />
          <span className="text-xl font-bold tracking-tight text-white uppercase">
            {match.sectionTitle}
          </span>
        </div>
        <p className="text-base leading-relaxed pl-[52px] text-slate-300 m-0">
          {match.cleanedChildren}
        </p>
      </li>
    );
  }
  return <li {...props}>{children}</li>;
};

function PresentationArchetypeWheel({ content }: { content: string }) {
  console.log('[PresentationArchetypeWheel] content:', JSON.stringify(content));
  const selected = parseArchetypes(content);
  console.log('[PresentationArchetypeWheel] selected:', selected);

  const cx = 250;
  const cy = 250;
  const r = 180;
  const iconR = 120;
  const textR = 215;

  return (
    <div className="w-full flex flex-col items-center select-none">
      <svg viewBox="-100 -50 700 600" className="w-full max-w-[560px] h-auto">
        {/* Outer Category Labels */}
        <text x={cx} y={cy - r - 25} textAnchor="middle" className="text-[9px] font-bold tracking-widest fill-slate-600 opacity-40 uppercase">Cambio</text>
        <text x={cx} y={cy + r + 32} textAnchor="middle" className="text-[9px] font-bold tracking-widest fill-slate-600 opacity-40 uppercase">Estabilidad</text>
        
        <text
          x={cx + r + 25}
          y={cy}
          textAnchor="middle"
          className="text-[9px] font-bold tracking-widest fill-slate-600 opacity-40 uppercase"
          transform={`rotate(90, ${cx + r + 25}, ${cy})`}
        >
          Colectividad
        </text>
        <text
          x={cx - r - 25}
          y={cy}
          textAnchor="middle"
          className="text-[9px] font-bold tracking-widest fill-slate-600 opacity-40 uppercase"
          transform={`rotate(-90, ${cx - r - 25}, ${cy})`}
        >
          Individualismo
        </text>

        {/* Render the 12 sectors */}
        {ARCHETYPES.map((arc, i) => {
          const startAngle = ((arc.angleStart - 90) * Math.PI) / 180;
          const endAngle = ((arc.angleEnd - 90) * Math.PI) / 180;
          const midAngle = startAngle + (endAngle - startAngle) / 2;

          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);

          const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

          const ix = cx + iconR * Math.cos(midAngle);
          const iy = cy + iconR * Math.sin(midAngle);

          const tx = cx + textR * Math.cos(midAngle);
          const ty = cy + textR * Math.sin(midAngle);

          let textAnchor: 'inherit' | 'end' | 'middle' | 'start' = 'middle';
          const cosValue = Math.cos(midAngle);
          if (cosValue > 0.2) textAnchor = 'start';
          else if (cosValue < -0.2) textAnchor = 'end';

          const isSelected = selected[arc.name] !== undefined;
          const percentage = selected[arc.name] || 0;
          const catColor = CATEGORY_COLORS[arc.category];

          return (
            <g key={arc.name}>
              {/* Slice Path */}
              <path
                d={pathData}
                fill={isSelected ? catColor : '#1d1d21'}
                fillOpacity={isSelected ? 0.3 + 0.7 * (percentage / 100) : 0.4}
                stroke="#0f0f11"
                strokeWidth="2.5"
              />

              {/* Icon */}
              <g
                transform={`translate(${ix - 12}, ${iy - 12})`}
                className={isSelected ? 'text-white' : 'text-slate-600'}
              >
                {ICON_PATHS[arc.icon]}
              </g>

              {/* Text label */}
              <text
                x={tx}
                y={ty}
                textAnchor={textAnchor}
                fill={isSelected ? '#ffffff' : '#9ca3af'}
                className={`transition-all duration-300 ${
                  isSelected 
                    ? 'text-[22px] font-bold' 
                    : 'text-[12px] font-medium'
                }`}
              >
                <tspan x={tx} dy="0">
                  {arc.name.replace('La ', '')}
                </tspan>
                {isSelected && (
                  <tspan x={tx} dy="22" fill={catColor} className="font-mono font-bold text-[17px]">
                    {percentage}%
                  </tspan>
                )}
              </text>
            </g>
          );
        })}

        {/* Inner center ring */}
        <circle cx={cx} cy={cy} r="25" fill="#0f0f11" stroke="#2a2a2f" strokeWidth="1" />
      </svg>
    </div>
  );
}

interface SavedMockups {
  card?: string;
  mobile?: string;
  letter?: string;
  tshirt?: string;
  tote?: string;
}

const CATEGORY_MAP: Record<string, keyof SavedMockups> = {
  'Tarjeta': 'card',
  'Movil': 'mobile',
  'Papel A4': 'letter',
  'Camiseta': 'tshirt',
  'Bolso Tote': 'tote'
};

const REVERSE_CATEGORY_MAP: Record<keyof SavedMockups, string> = {
  card: 'Tarjeta',
  mobile: 'Movil',
  letter: 'Papel A4',
  tshirt: 'Camiseta',
  tote: 'Bolso Tote'
};

function parseSavedMockups(md: string): SavedMockups {
  const mockups: SavedMockups = {};
  const regex = /!\[Mockup (Tarjeta|Movil|Papel A4|Camiseta|Bolso Tote)\]\((data:image\/[^)]+)\)/g;
  let match;
  while ((match = regex.exec(md)) !== null) {
    const label = match[1];
    const base64 = match[2];
    const key = CATEGORY_MAP[label];
    if (key) {
      mockups[key] = base64;
    }
  }
  return mockups;
}

function cleanMarkdownMockups(md: string): string {
  const regex = /\s*\n*!\[Mockup (Tarjeta|Movil|Papel A4|Camiseta|Bolso Tote)\]\(data:image\/[^)]+\)/g;
  return md.replace(regex, '').trim();
}

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
        {/* Top Progress Line (13 segments representing block validation progress) */}
        <div className="flex h-1 w-full bg-slate-100 shrink-0">
          {BLOCK_DEFINITIONS.map((def, idx) => {
            const block = blocks.find(b => b.block_id === def.id);
            const isValidated = block?.status === 'validado';
            const stage = STAGES.find(s => s.key === def.stage);
            
            return (
              <div 
                key={def.id}
                className="flex-1 h-full transition-all duration-300"
                style={{
                  backgroundColor: isValidated ? (stage?.color || '#8B5CF6') : '#e2e8f0',
                  borderRight: idx < 12 ? '1px solid #ffffff' : 'none'
                }}
                title={`${def.id}. ${def.title} (${isValidated ? 'Validado' : 'Pendiente'})`}
              />
            );
          })}
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = stageIcons[blockDef.stage];
              return Icon ? (
                <Icon className="h-4.5 w-4.5 shrink-0" style={{ color: stage?.color || '#8B5CF6' }} />
              ) : (
                <span className="font-bold text-xs shrink-0" style={{ color: stage?.color || '#8B5CF6' }}>{blockDef.stage}</span>
              );
            })()}
            <span className="text-sm font-medium text-slate-500">{activeBrand.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm font-medium text-slate-400">
              {currentSlide + 1} / {totalSlides}
            </span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              title="Salir de presentación (ESC)"
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
              <span>Volver al Panel</span>
            </button>
          </div>
        </div>

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto px-16 py-12 flex justify-center items-start">
          <div className="w-full max-w-3xl my-auto">
            {/* Block number and stage */}
            <div className="mb-4 flex items-center gap-3">
              <span
                className="text-3xl font-black font-mono tracking-tight shrink-0 select-none"
                style={{ color: stage?.color || '#8B5CF6' }}
              >
                {blockDef.id < 10 ? `0${blockDef.id}` : blockDef.id}
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
            <div className="pr-2">
              {blockDef.id === 4 ? (
                <div className="flex flex-col items-center mt-4 w-full">
                  {(() => {
                    const cleanContent = content
                      .replace(/^### Arquetipos Seleccionados\s*\n?/gi, '')
                      .replace(/^(?:[\*\-]\s*)?\*\*(La\s+[^*]+?)\*\*\:\s*\d+\s*%\s*\n?/gim, '')
                      .replace(/^---\s*\n?/gi, '')
                      .trim();
                    
                    return cleanContent ? (
                      <div className="markdown-preview max-w-none w-full text-left mb-8">
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
                            h1: (props) => <HeadingRenderer level={1} {...props} />,
                            h2: (props) => <HeadingRenderer level={2} {...props} />,
                            h3: (props) => <HeadingRenderer level={3} {...props} />,
                            h4: (props) => <HeadingRenderer level={4} {...props} />,
                            h5: (props) => <HeadingRenderer level={5} {...props} />,
                            h6: (props) => <HeadingRenderer level={6} {...props} />,
                            p: (props) => <ParagraphRenderer {...props} />,
                            li: (props) => <LiRenderer {...props} />,
                          }}
                        >
                          {cleanContent
                            .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                            .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                        </ReactMarkdown>
                      </div>
                    ) : null;
                  })()}
                  <div className="w-full flex justify-center mt-2">
                    <PresentationArchetypeWheel content={content} />
                  </div>
                </div>
              ) : blockDef.id === 7 ? (
                <div className="space-y-8 w-full">
                  {/* Clean text description */}
                  {(() => {
                    const cleanContent = cleanMarkdownMockups(content);
                    return cleanContent ? (
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
                            h1: (props) => <HeadingRenderer level={1} {...props} />,
                            h2: (props) => <HeadingRenderer level={2} {...props} />,
                            h3: (props) => <HeadingRenderer level={3} {...props} />,
                            h4: (props) => <HeadingRenderer level={4} {...props} />,
                            h5: (props) => <HeadingRenderer level={5} {...props} />,
                            h6: (props) => <HeadingRenderer level={6} {...props} />,
                            p: (props) => <ParagraphRenderer {...props} />,
                            li: (props) => <LiRenderer {...props} />,
                          }}
                        >
                          {cleanContent
                            .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                            .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <p className="text-sm text-slate-400 italic">Conceptualización visual de marca</p>
                      </div>
                    );
                  })()}

                  {/* Grid gallery of saved mockups */}
                  {(() => {
                    const saved = parseSavedMockups(content);
                    const savedList = Object.entries(saved).filter(([_, val]) => !!val);
                    if (savedList.length === 0) return null;

                    const labels: Record<string, string> = {
                      card: 'Tarjeta comercial',
                      mobile: 'Interfaz móvil',
                      letter: 'Papel membretado A4',
                      tshirt: 'Camiseta de marca',
                      tote: 'Bolso tote de algodón'
                    };

                    return (
                      <div className="mt-8 border-t border-slate-100 pt-6">
                        <div className="grid grid-cols-2 gap-8">
                          {savedList.map(([key, base64]) => {
                            const label = labels[key] || key;
                            return (
                              <div key={key} className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none px-0.5">{label}</span>
                                <div className="overflow-hidden rounded-lg shadow-md aspect-[16/10] flex justify-center items-center bg-transparent">
                                  <img 
                                    src={base64} 
                                    alt={`Mockup ${label}`} 
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : content.trim() ? (
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
                      h1: (props) => <HeadingRenderer level={1} {...props} />,
                      h2: (props) => <HeadingRenderer level={2} {...props} />,
                      h3: (props) => <HeadingRenderer level={3} {...props} />,
                      h4: (props) => <HeadingRenderer level={4} {...props} />,
                      h5: (props) => <HeadingRenderer level={5} {...props} />,
                      h6: (props) => <HeadingRenderer level={6} {...props} />,
                      p: (props) => <ParagraphRenderer {...props} />,
                      li: (props) => <LiRenderer {...props} />,
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
