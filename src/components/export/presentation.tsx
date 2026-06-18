'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Sparkles, MessageSquare, Users, Shield, Info, Trophy, Star } from 'lucide-react';

const stageIcons: Record<string, React.ComponentType<any>> = {
  'A': Sparkles,
  'B': MessageSquare,
  'C': Users,
  'D': Shield,
};
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import { BLOCK_DEFINITIONS, STAGES } from '@/lib/data/block-definitions';
import type { BrandBlock, NamingCandidate } from '@/lib/db/types';
import { splitNamingRationale, splitBlock3Content } from '@/lib/utils/naming-content';
import ReactMarkdown from 'react-markdown';
import { ARCHETYPES, CATEGORY_COLORS, ICON_PATHS, parseArchetypes } from '@/components/blocks/archetype-lab';
import { getClosestColorName } from '@/components/blocks/visual-lab';
import {
  parseSavedMockups,
  parseSavedColors,
  parseSavedAnalysis,
  parseSavedVariants,
  splitBlock7Content,
  BrandVariant,
  SavedMockups
} from '@/lib/utils/visual-content';

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




function PresentationNamingLab({ content, candidates }: { content: string; candidates: NamingCandidate[] }) {
  const cleanContent = splitBlock3Content(content);

  return (
    <div className="space-y-8 w-full">
      {/* Intro Description */}
      {cleanContent && (
        <div className="markdown-preview max-w-none text-slate-700">
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
      )}

      {/* Candidates Cards Grid */}
      <div className="border-t border-slate-100 pt-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-sans mb-4 select-none">
          <Star className="h-4.5 w-4.5 text-violet-500 fill-violet-500 animate-pulse" />
          Candidatos Analizados
        </h3>

        {candidates.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No hay candidatos en el Laboratorio de Naming.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {candidates.map((candidate) => {
              const { userRationale, analysis } = splitNamingRationale(candidate.rationale_md);

              // Status configuration
              let cardStyle = 'border-slate-200 bg-white';
              let badgeStyle = 'bg-blue-50 text-blue-600 border-blue-200';
              let statusText = 'Candidato';
              let statusIcon = <Star className="h-3 w-3 fill-blue-500 text-blue-500" />;

              if (candidate.status === 'elegido') {
                cardStyle = 'border-emerald-400 bg-emerald-50/10 shadow-[0_0_12px_rgba(16,185,129,0.08)] ring-1 ring-emerald-400/30';
                badgeStyle = 'bg-emerald-50 text-emerald-750 border-emerald-200 font-bold';
                statusText = 'Elegido';
                statusIcon = <Trophy className="h-3 w-3 fill-amber-500 text-amber-500" />;
              } else if (candidate.status === 'descartado') {
                cardStyle = 'border-slate-200 bg-slate-50'; // Removed opacity-60 from card level
                badgeStyle = 'bg-slate-100 text-slate-500 border-slate-200';
                statusText = 'Descartado';
                statusIcon = <X className="h-3 w-3 text-slate-400" />;
              }

              const isDiscarded = candidate.status === 'descartado';

              return (
                <div key={candidate.id} className={`flex flex-col border rounded-xl p-5 transition-all hover:shadow-md ${cardStyle}`}>
                  {/* Name and Status Header */}
                  <div className={`flex items-center justify-between mb-3.5 select-none ${isDiscarded ? 'opacity-50' : ''}`}>
                    <span className={`text-lg font-bold tracking-tight ${candidate.status === 'elegido' ? 'text-emerald-800' : candidate.status === 'descartado' ? 'text-slate-500' : 'text-slate-800'}`}>
                      {candidate.name}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${badgeStyle}`}>
                      {statusIcon}
                      {statusText}
                    </span>
                  </div>

                  {/* Veto Reason if discarded - kept at 100% opacity for high contrast/readability */}
                  {isDiscarded && candidate.veto_reason && (
                    <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/35 px-3 py-2.5 text-xs text-red-300 font-sans italic shadow-sm">
                      <strong className="text-red-400 not-italic mr-1">Motivo de veto:</strong> {candidate.veto_reason}
                    </div>
                  )}

                  {/* Rationale/Notes */}
                  {userRationale && (
                    <div className={`mb-4 ${isDiscarded ? 'opacity-60' : ''}`}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1 select-none">Notas del Equipo</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">{userRationale}</p>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {analysis && (
                    <div className={`mt-auto border-t border-slate-100 pt-3.5 space-y-4 ${isDiscarded ? 'opacity-60' : ''}`}>
                      {/* Score Badge */}
                      <div className="flex items-center justify-between select-none">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-blue-500" />
                          Auditoría de Naming
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-md">
                          <span>{analysis.overallScore}/100</span>
                        </div>
                      </div>

                      {/* 7 parameters ratings */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {analysis.parameters.map((p, idx) => {
                          const isHigh = p.score >= 8;
                          const isMid = p.score >= 5 && p.score < 8;
                          const barColor = isHigh ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-red-500';
                          return (
                            <div key={idx} className="space-y-0.5">
                              <div className="flex items-center justify-between text-slate-500 font-medium select-none">
                                <span className="truncate max-w-[95px]">{p.name}</span>
                                <span className="font-mono font-bold">{p.score}/10</span>
                              </div>
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor}`} style={{ width: `${p.score * 10}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pros & Cons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[10px]">
                        {analysis.pros?.length > 0 && (
                          <div className="bg-emerald-50/20 border border-emerald-100/50 rounded-lg p-2.5">
                            <span className="font-bold text-emerald-800 block mb-1 select-none">Pros</span>
                            <ul className="list-disc pl-3.5 text-slate-600 space-y-0.5 leading-snug">
                              {analysis.pros.slice(0, 2).map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                          </div>
                        )}
                        {analysis.contras?.length > 0 && (
                          <div className="bg-red-50/10 border border-red-100/40 rounded-lg p-2.5">
                            <span className="font-bold text-red-800 block mb-1 select-none">Contras</span>
                            <ul className="list-disc pl-3.5 text-slate-600 space-y-0.5 leading-snug">
                              {analysis.contras.slice(0, 2).map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Claims */}
                      {analysis.claims?.length > 0 && (
                        <div className="bg-blue-50/20 border border-blue-100/50 rounded-lg p-2.5 text-[10px]">
                          <span className="font-bold text-blue-800 block mb-1 select-none font-sans">Propuesta de Taglines</span>
                          <div className="flex flex-wrap gap-1">
                            {analysis.claims.slice(0, 2).map((c, i) => (
                              <span key={i} className="inline-block bg-white px-2 py-0.5 rounded border border-blue-50 text-blue-750 font-medium italic">
                                "{c}"
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function Presentation() {
  const { activeBrand } = useBrand();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [blocks, setBlocks] = useState<BrandBlock[]>([]);
  const [candidates, setCandidates] = useState<NamingCandidate[]>([]);

  useEffect(() => {
    if (!activeBrand) {
      setBlocks([]);
      setCandidates([]);
      return;
    }
    let cancelled = false;
    async function loadData() {
      try {
        const [blocksData, candidatesData] = await Promise.all([
          db.getBrandBlocks(activeBrand!.id),
          db.getNamingCandidates(activeBrand!.id),
        ]);
        if (!cancelled) {
          setBlocks(blocksData);
          setCandidates(candidatesData);
        }
      } catch (err) {
        console.error('[Presentation] Failed to load brand data:', err);
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
            {/* Title with Number */}
            <h1 className="mb-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900 flex items-start gap-4">
              <span
                className="font-mono select-none shrink-0"
                style={{ color: stage?.color || '#8B5CF6' }}
              >
                {blockDef.id < 10 ? `0${blockDef.id}` : blockDef.id}
              </span>
              <span className="font-extrabold">
                {blockDef.title}
              </span>
            </h1>

            {/* Description */}
            <p className="mb-8 text-base text-slate-400 leading-relaxed font-medium">{blockDef.description}</p>

            {/* Content */}
            <div className="pr-2">
              {blockDef.id === 3 ? (
                <PresentationNamingLab content={content} candidates={candidates} />
              ) : blockDef.id === 4 ? (
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
                    const cleanContent = splitBlock7Content(content).rawMarkdown;
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
                    ) : null;
                  })()}

                  {/* Logo and colors block */}
                  {activeBrand?.logo_path && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-slate-100 pt-6">
                      <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-xl bg-slate-50 shadow-sm aspect-video max-h-[180px]">
                        <img src={activeBrand.logo_path} alt="Logo" className="max-h-[130px] object-contain" />
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Paleta de Colores Corporativos</span>
                        {(() => {
                          const colors = parseSavedColors(content);
                          if (colors.length === 0) {
                            return <span className="text-xs text-slate-400 italic">No hay colores guardados en la paleta.</span>;
                          }
                          return (
                            <div className="flex flex-wrap gap-2.5">
                              {colors.map((hex, idx) => {
                                const nameRole = getClosestColorName(hex);
                                return (
                                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-full py-1 pl-1.5 pr-3.5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="h-6.5 w-6.5 rounded-full border border-slate-200 shadow-inner shrink-0" style={{ backgroundColor: hex }} />
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-800 leading-none uppercase font-mono">{hex}</span>
                                      <span className="text-[8.5px] text-slate-450 font-semibold leading-none mt-0.5 truncate max-w-[100px]" title={nameRole.name}>{nameRole.name}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Alternative logo variants block */}
                  {(() => {
                    const variantsList = parseSavedVariants(content);
                    if (variantsList.length === 0) return null;

                    return (
                      <div className="mt-6 border-t border-slate-100 pt-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none block mb-3">Variantes Alternativas de la Marca</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {variantsList.map(v => (
                            <div key={v.id} className="flex flex-col items-center gap-2 p-3.5 border border-slate-100 rounded-xl bg-slate-50 shadow-sm">
                              <div className="h-16 w-full flex items-center justify-center overflow-hidden shrink-0">
                                <img src={v.base64} alt={v.name} className="max-h-full object-contain" />
                              </div>
                              <span className="text-[9.5px] font-bold text-slate-700 text-center truncate w-full" title={v.name}>{v.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 15 Parameters Audit Section */}
                  {(() => {
                    const analysis = parseSavedAnalysis(content);
                    if (!analysis) return null;

                    return (
                      <div className="mt-8 border-t border-slate-100 pt-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-5 gap-3">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-sans">
                              <Sparkles className="h-4.5 w-4.5 text-blue-500" />
                              Auditoría de Rendimiento (15 Parámetros)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Examen técnico del logotipo bajo el modelo clásico de evaluación de rendimiento corporativo.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 px-3 py-1 rounded-lg text-xs font-semibold self-start shadow-sm select-none">
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-sans">Valoración Global:</span>
                            <span className={`font-black text-sm ${
                              analysis.overallScore >= 80 
                                ? 'text-emerald-600' 
                                : analysis.overallScore >= 50 
                                  ? 'text-amber-600' 
                                  : 'text-red-600'
                            }`}>{analysis.overallScore} / 100</span>
                          </div>
                        </div>

                        {/* Parameters grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {analysis.parameters.map((p: any) => {
                            const isHigh = p.score >= 8;
                            const isMid = p.score >= 5 && p.score < 8;
                            const barColor = isHigh ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-red-500';
                            const textColor = isHigh ? 'text-emerald-600' : isMid ? 'text-amber-600' : 'text-red-600';

                            return (
                              <div key={p.id} className="bg-slate-50/50 border border-slate-100 rounded-lg p-3 flex flex-col justify-between hover:border-slate-200 transition-colors">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8.5px] font-bold text-slate-400 font-mono tracking-wider">{String(p.id).padStart(2, '0')}. {p.name.toUpperCase()}</span>
                                    <span className={`text-xs font-black font-mono ${textColor}`}>{p.score}/10</span>
                                  </div>
                                  <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${barColor}`} style={{ width: `${p.score * 10}%` }} />
                                  </div>
                                  <p className="text-[10px] text-slate-500 leading-normal pt-1 font-sans">{p.text}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Conclusion footer */}
                        <div className="mt-4 border border-slate-100 bg-slate-50 p-4 rounded-lg flex gap-3 items-start">
                          <Info className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Dictamen del Auditor</span>
                            <p className="text-[11px] text-slate-600 leading-relaxed mt-1 font-sans">{analysis.conclusion}</p>
                          </div>
                        </div>
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
                        <div className="flex flex-col gap-1.5 mb-4 select-none">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visualización en Formatos</span>
                          <p className="text-[10.5px] text-slate-455 leading-none">Formatos publicitarios y papelería corporativa generados para la marca.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          {savedList.map(([key, base64]) => {
                            const label = labels[key] || key;
                            return (
                              <div key={key} className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none px-0.5">{label}</span>
                                <div className="overflow-hidden rounded-lg shadow-md aspect-[16/10] flex justify-center items-center bg-transparent border border-slate-100">
                                  <img 
                                    src={base64} 
                                    alt={`Mockup ${label}`} 
                                    className="w-full h-full object-cover" 
                                    loading="lazy"
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
