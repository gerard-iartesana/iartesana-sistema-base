'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Sparkles, MessageSquare, Users, Shield, Info, Trophy, Star, Target, Award, CheckCircle2, ShieldAlert, BookOpen, Ban, Eye, Sun, Moon, Heart, Mic, MicOff, Send, Trash2, Pencil, Check } from 'lucide-react';

const stageIcons: Record<string, React.ComponentType<any>> = {
  'A': Heart,
  'B': MessageSquare,
  'C': Users,
  'D': Shield,
};
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import { BLOCK_DEFINITIONS, STAGES } from '@/lib/data/block-definitions';
import type { BrandBlock, NamingCandidate, Rule, KnowledgeItem, SlideComment } from '@/lib/db/types';
import { splitNamingRationale, splitBlock3Content } from '@/lib/utils/naming-content';
import { parseValueProposition, parseValuesList } from '@/lib/utils/valprop-content';
import ReactMarkdown from 'react-markdown';
import { ARCHETYPES, CATEGORY_COLORS, ICON_PATHS, parseArchetypes, parseArchetypeWheels, cleanBlock4Content } from '@/components/blocks/archetype-lab';
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
import { parseVoiceTensions, splitBlock5Content } from '@/lib/utils/voice-content';
import { parseVerbalIdentity, splitBlock6Content } from '@/lib/utils/verbal-content';

function preprocessMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown.replace(/([^\n]+)\n([=-]{3,})\s*(?:\n|$)/g, '$1\n\n$2\n');
}

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
          <span className="text-xl font-bold tracking-tight text-slate-800 uppercase">
            {match.sectionTitle}
          </span>
        </div>
        <p className="text-base leading-relaxed pl-[52px] text-slate-600 m-0">
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
          <span className="text-xl font-bold tracking-tight text-slate-800 uppercase">
            {match.sectionTitle}
          </span>
        </div>
        <p className="text-base leading-relaxed pl-[52px] text-slate-600 m-0">
          {match.cleanedChildren}
        </p>
      </li>
    );
  }
  return <li {...props}>{children}</li>;
};

function PresentationArchetypeWheel({ content, isDarkMode = true }: { content: string; isDarkMode?: boolean }) {
  console.log('[PresentationArchetypeWheel] content:', JSON.stringify(content));
  const wheels = parseArchetypeWheels(content);
  console.log('[PresentationArchetypeWheel] wheels:', wheels);

  const cx = 250;
  const cy = 250;
  const r = 180;
  const iconR = 120;
  const textR = 215;

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 select-none">
      {wheels.map((wheel, wIdx) => {
        const selected = wheel.selected;
        return (
          <div key={wIdx} className="flex flex-col items-center gap-3 w-full max-w-[280px]">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              Público: {wheel.target}
            </h4>
            <svg viewBox="-100 -50 700 600" className="w-full h-auto">
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
                      fill={isSelected ? catColor : (isDarkMode ? '#1d1d21' : '#f1f5f9')}
                      fillOpacity={isSelected ? 0.3 + 0.7 * (percentage / 100) : 0.4}
                      stroke={isDarkMode ? '#0f0f11' : '#cbd5e1'}
                      strokeWidth="2.5"
                    />

                    {/* Icon */}
                    <g
                      transform={`translate(${ix - 12}, ${iy - 12})`}
                      className={isSelected ? (isDarkMode ? 'text-white' : 'text-slate-900') : (isDarkMode ? 'text-slate-650' : 'text-slate-400')}
                    >
                      {ICON_PATHS[arc.icon]}
                    </g>

                    {/* Text label */}
                    <text
                      x={tx}
                      y={ty}
                      textAnchor={textAnchor}
                      fill={isSelected ? (isDarkMode ? '#ffffff' : '#0f172a') : (isDarkMode ? '#9ca3af' : '#64748b')}
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
              <circle cx={cx} cy={cy} r="25" fill={isDarkMode ? '#0f0f11' : '#ffffff'} stroke={isDarkMode ? '#2a2a2f' : '#cbd5e1'} strokeWidth="1" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}




function PresentationNamingLab({ content, candidates }: { content: string; candidates: NamingCandidate[] }) {
  const cleanContent = splitBlock3Content(content);

  // Sort candidates: Chosen (elegido) first, then Candidate (candidato) sorted by score/name, then Discarded (descartado)
  const sortedCandidates = [...candidates].sort((a, b) => {
    const statusOrder = { elegido: 1, candidato: 2, descartado: 3 };
    const priorityA = statusOrder[a.status] ?? 99;
    const priorityB = statusOrder[b.status] ?? 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Sort within status by AI overallScore descending
    const { analysis: analysisA } = splitNamingRationale(a.rationale_md);
    const { analysis: analysisB } = splitNamingRationale(b.rationale_md);
    const scoreA = analysisA?.overallScore ?? 0;
    const scoreB = analysisB?.overallScore ?? 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // Secondary fallback: alphabetical
    return a.name.localeCompare(b.name);
  });

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
            {preprocessMarkdown(cleanContent)
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
            {sortedCandidates.map((candidate) => {
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
                    <div className="mb-3 rounded-lg bg-red-950/40 border border-red-900/50 px-3 py-2.5 text-xs text-red-200 font-sans italic shadow-sm">
                      <strong className="text-red-400 not-italic mr-1 font-bold">Motivo de veto:</strong> {candidate.veto_reason}
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

function PresentationVoiceTensions({ content }: { content: string }) {
  const { rawMarkdown, tensions } = splitBlock5Content(content);

  return (
    <div className="space-y-8 w-full mt-4">
      {/* Intro Description */}
      {rawMarkdown && (
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
            {preprocessMarkdown(rawMarkdown)
              .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
              .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
          </ReactMarkdown>
        </div>
      )}

      {/* Visual Tensions List */}
      {tensions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
          {tensions.map((t, idx) => {
            const leftPercent = 100 - t.value;
            const rightPercent = t.value;
            
            return (
              <div key={idx} className="flex flex-col bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Labels and calculated percent */}
                <div className="flex justify-between items-baseline mb-2">
                  <span className={`text-base font-bold transition-all ${leftPercent > 50 ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-medium'}`}>
                    {t.left} {leftPercent > 50 && `(${leftPercent}%)`}
                  </span>
                  <span className={`text-base font-bold transition-all ${rightPercent > 50 ? 'text-slate-900 font-extrabold' : 'text-slate-400 font-medium'}`}>
                    {rightPercent > 50 && `(${rightPercent}%)`} {t.right}
                  </span>
                </div>

                {/* Sleek slider bar */}
                <div className="relative w-full h-[3px] bg-slate-200 dark:bg-zinc-800 rounded-full my-4">
                  {/* Colored track from center (50%) to the active value */}
                  <div 
                    className="absolute top-0 bottom-0 bg-[#e3599c] rounded-full transition-all duration-300"
                    style={{
                      left: t.value < 50 ? `${t.value}%` : '50%',
                      right: t.value >= 50 ? `${100 - t.value}%` : '50%',
                    }}
                  />
                  {/* The dot indicator */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#e3599c] shadow-[0_0_8px_rgba(227,89,156,0.6)] transition-all duration-300 transform -translate-x-1/2 cursor-default"
                    style={{
                      left: `${t.value}%`,
                    }}
                  />
                </div>

                {/* Description */}
                <p className="text-sm text-slate-650 leading-relaxed font-sans mt-2 whitespace-pre-line">
                  {t.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PresentationValueProp({ content }: { content: string }) {
  const { mission, vision, values } = parseValueProposition(content);
  const valuesList = parseValuesList(values);

  const hasContent = mission.trim() || vision.trim() || valuesList.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-slate-300 italic">Sin contenido</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mission Card */}
        {mission.trim() && (
          <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 select-none">
              <Target className="h-6 w-6 text-violet-500" />
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Misión</span>
            </div>
            <p className="text-base text-slate-750 leading-relaxed font-sans">{mission}</p>
          </div>
        )}

        {/* Vision Card */}
        {vision.trim() && (
          <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4 select-none">
              <Eye className="h-6 w-6 text-blue-500" />
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Visión</span>
            </div>
            <p className="text-base text-slate-750 leading-relaxed font-sans">{vision}</p>
          </div>
        )}
      </div>

      {/* Values Section */}
      {valuesList.length > 0 && (
        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-5 select-none">
            <Award className="h-6 w-6 text-emerald-500" />
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Valores de Marca</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {valuesList.map((val, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border-0">
                <span className="text-xl font-bold text-slate-800 block mb-2">{val.title}</span>
                {val.text && <p className="text-base text-slate-600 leading-relaxed font-sans">{val.text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PresentationKnowledgeLibrary({ items }: { items: KnowledgeItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-slate-300 italic">No hay ítems en la Biblioteca de Conocimiento.</p>
      </div>
    );
  }

  const kindConfig: Record<string, { label: string; badgeClass: string }> = {
    recomendacion: { label: 'Recomendación', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    faq: { label: 'FAQ', badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
    politica: { label: 'Política', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    normativa: { label: 'Normativa', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {items.map((item) => {
        const config = kindConfig[item.kind] || { label: item.kind, badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
        return (
          <div key={item.id} className="flex flex-col border border-slate-200 rounded-2xl p-6 bg-slate-50/50 shadow-sm hover:shadow-md transition-shadow animate-fade-in">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${config.badgeClass}`}>
                {config.label}
              </span>
              {item.audience && (
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/50 truncate max-w-[150px]" title={item.audience}>
                  Público: {item.audience}
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-slate-800 mb-3 leading-snug">{item.title}</h4>
            <div className="text-sm text-slate-600 leading-relaxed font-sans flex-1">
              <ReactMarkdown>{item.body_md}</ReactMarkdown>
            </div>
            {item.verified && (
              <div className="mt-5 border-t border-slate-150/40 pt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 select-none">
                <CheckCircle2 className="h-4 w-4" />
                <span>Verificado</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PresentationRules({ rules, kind }: { rules: Rule[]; kind: 'linea_roja' | 'protocolo_incidencia' | 'instruccion_ia' }) {
  const blockRules = rules.filter(r => r.kind === kind).sort((a, b) => a.sort - b.sort);

  if (blockRules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-slate-300 italic">No hay reglas definidas para este bloque.</p>
      </div>
    );
  }

  const kindConfig = {
    linea_roja: {
      colorClass: 'text-red-400',
      borderClass: 'border-red-500/25',
      bgClass: 'bg-red-500/5',
      icon: <Ban className="h-5 w-5 text-red-400" />
    },
    protocolo_incidencia: {
      colorClass: 'text-amber-400',
      borderClass: 'border-amber-500/25',
      bgClass: 'bg-amber-500/5',
      icon: <ShieldAlert className="h-5 w-5 text-amber-400" />
    },
    instruccion_ia: {
      colorClass: 'text-violet-400',
      borderClass: 'border-violet-500/25',
      bgClass: 'bg-violet-500/5',
      icon: <BookOpen className="h-5 w-5 text-violet-400" />
    }
  };

  const config = kindConfig[kind];

  return (
    <div className="space-y-4 mt-6">
      {blockRules.map((rule, idx) => (
        <div key={rule.id} className={`flex gap-4 border rounded-2xl p-5 bg-slate-50/50 shadow-sm ${config.borderClass}`}>
          <div className="flex flex-col items-center shrink-0">
            <span className="font-mono text-lg font-black text-slate-400/80">{(idx + 1).toString().padStart(2, '0')}</span>
            <div className="mt-2">{config.icon}</div>
          </div>
          <div className="text-base text-slate-700 leading-relaxed font-sans pt-0.5">
            <ReactMarkdown>{rule.body_md}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}


const defaultImageMap: Record<string, string> = {
  voz_escrita: '/images/verbal_voz_escrita.png',
  tuteo: '/images/verbal_idiomas.png',
  usamos: '/images/verbal_glosario_usamos.png',
  evitar: '/images/verbal_glosario_evitar.png',
};

function PresentationVerbalIdentity({ content, isDarkMode = true }: { content: string; isDarkMode?: boolean }) {
  const { rawMarkdown, images } = splitBlock6Content(content);
  const sections = parseVerbalIdentity(rawMarkdown);

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-slate-400 italic">Sin contenido</p>
      </div>
    );
  }

  const getSectionKey = (title: string) => {
    return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  return (
    <div className="space-y-16 w-full mt-4">
      {sections.map((section, idx) => {
        const sectionKey = getSectionKey(section.title);
        const imageSrc = images[sectionKey] || images[section.type] || defaultImageMap[section.type];
        const isEven = idx % 2 === 0;

        if (imageSrc) {
          const textBlock = (
            <div className="flex-1 space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {section.type === 'voz_escrita' && <Sparkles className="h-5 w-5 text-violet-400" />}
                {section.type === 'tuteo' && <MessageSquare className="h-5 w-5 text-blue-400" />}
                {section.type === 'usamos' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {section.type === 'evitar' && <ShieldAlert className="h-5 w-5 text-red-400" />}
                {section.title}
              </h2>
              
              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.items.map((item, i) => (
                    <div 
                      key={i} 
                      className={`p-4 rounded-xl border transition-all duration-300 ${
                        section.type === 'usamos' 
                          ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10'
                          : 'border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {section.type === 'usamos' ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          {item.term && <span className="text-sm font-bold text-white block">{item.term}</span>}
                          <span className="text-xs text-slate-350 leading-relaxed block mt-1 font-sans">{item.definition}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-350 leading-relaxed text-sm font-sans space-y-3">
                  <ReactMarkdown
                    components={{
                      a: ({ href, children, ...props }) => {
                        if (href === '#marker-pendiente') {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30 select-none">
                              {children}
                            </span>
                          );
                        }
                        if (href === '#marker-verificar') {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/30 select-none">
                              {children}
                            </span>
                          );
                        }
                        return <a href={href} {...props}>{children}</a>;
                      },
                    }}
                  >
                    {preprocessMarkdown(section.content)
                      .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                      .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );

          const imageBlock = (
            <div className="w-full md:w-[320px] shrink-0 flex items-center justify-center select-none">
              <img 
                src={imageSrc} 
                alt={section.title} 
                className={`w-full h-auto object-contain aspect-square ${isDarkMode ? 'invert mix-blend-difference opacity-50' : 'mix-blend-multiply opacity-70'}`}
                loading="lazy"
              />
            </div>
          );

          return (
            <div 
              key={idx} 
              className={`flex flex-col md:flex-row gap-8 items-center border-t border-slate-800/60 pt-10 first:border-t-0 first:pt-0 ${
                isEven ? '' : 'md:flex-row-reverse'
              }`}
            >
              {textBlock}
              {imageBlock}
            </div>
          );
        } else {
          return (
            <div key={idx} className="border-t border-slate-800/60 pt-10 space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-violet-400" />
                {section.title}
              </h2>
              
              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {section.items.map((item, i) => (
                    <div 
                      key={i} 
                      className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-300 shadow-sm"
                    >
                      {item.term && <span className="text-sm font-bold text-violet-300 block mb-2">{item.term}</span>}
                      <span className="text-xs text-slate-350 leading-relaxed font-sans block">{item.definition}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-350 leading-relaxed text-sm font-sans">
                  <ReactMarkdown
                    components={{
                      a: ({ href, children, ...props }) => {
                        if (href === '#marker-pendiente') {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30 select-none">
                              {children}
                            </span>
                          );
                        }
                        if (href === '#marker-verificar') {
                          return (
                            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-semibold text-red-400 border border-red-500/30 select-none">
                              {children}
                            </span>
                          );
                        }
                        return <a href={href} {...props}>{children}</a>;
                      },
                    }}
                  >
                    {preprocessMarkdown(section.content)
                      .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                      .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          );
        }
      })}
    </div>
  );
}

// ===========================================================================
// PRESENTATION COMMENTS PANEL (SIDEBAR)
// ===========================================================================
function PresentationComments({
  brandId,
  blockId,
  isAuthorized
}: {
  brandId: string;
  blockId: number;
  isAuthorized: boolean;
}) {
  const [comments, setComments] = useState<SlideComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('Cliente');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const data = await db.getSlideComments(brandId, blockId);
        if (active) setComments(data);
      } catch (err) {
        console.error('Error loading comments:', err);
      }
    }
    loadData();

    async function loadUser() {
      const user = await db.getCurrentUser();
      if (active && user) {
        setAuthorName(user.name);
      } else if (active) {
        const cached = localStorage.getItem('comments_author_name');
        setAuthorName(cached || 'Cliente');
      }
    }
    loadUser();

    return () => { active = false; };
  }, [brandId, blockId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'es-ES';

        rec.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setNewComment(prev => (prev ? prev + ' ' + finalTranscript.trim() : finalTranscript.trim()));
          }
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      alert('La transcripción de voz no está soportada en este navegador. Te recomendamos usar Google Chrome o Safari.');
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const name = authorName.trim() || 'Cliente';
    localStorage.setItem('comments_author_name', name);

    try {
      const created = await db.createSlideComment({
        brand_id: brandId,
        block_id: blockId,
        author_name: name,
        comment_text: newComment.trim(),
      });
      setComments(prev => [...prev, created]);
      setNewComment('');
    } catch (err) {
      console.error('Error creating comment:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;
    try {
      const success = await db.deleteSlideComment(id);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== id));
        if (editingId === id) {
          setEditingId(null);
          setEditingText('');
        }
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleEditSave = async (id: string) => {
    if (!editingText.trim()) return;
    setIsSavingEdit(true);
    try {
      const updated = await db.updateSlideComment(id, editingText.trim());
      if (updated) {
        setComments(prev => prev.map(c => c.id === id ? updated : c));
        setEditingId(null);
        setEditingText('');
      }
    } catch (err) {
      console.error('Error updating comment:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col h-full font-sans select-none">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-bold text-slate-800">Anotaciones de la Diapositiva</h3>
        </div>
        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
          {comments.length}
        </span>
      </div>

      {/* List of comments */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="h-8 w-8 text-slate-200 mb-2 opacity-60" />
            <p className="text-xs text-slate-400 font-medium">Aún no hay anotaciones en esta slide.</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Usa el formulario de abajo para añadir tus impresiones o comentarios de voz.</p>
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="bg-slate-50/50 border border-slate-150 rounded-xl p-3 shadow-sm flex flex-col group relative">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                  {c.author_name}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {new Date(c.created_at).toLocaleDateString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {editingId === c.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    rows={2}
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
                    disabled={isSavingEdit}
                    required
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditingText('');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-[10px] font-semibold transition-colors cursor-pointer"
                      disabled={isSavingEdit}
                    >
                      <X className="h-2.5 w-2.5 shrink-0" />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSave(c.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-[10px] font-semibold transition-colors cursor-pointer"
                      disabled={isSavingEdit || !editingText.trim()}
                    >
                      <Check className="h-2.5 w-2.5 shrink-0" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans break-words whitespace-pre-wrap pr-12">
                    {c.comment_text}
                  </p>
                  <div className="absolute right-2.5 bottom-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingText(c.comment_text);
                      }}
                      className="text-slate-350 hover:text-violet-600 transition-colors p-1 hover:bg-violet-50 rounded cursor-pointer"
                      title="Editar comentario"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-slate-350 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded cursor-pointer"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form section at bottom */}
      <form onSubmit={handleSend} className="border-t border-slate-100 p-4 space-y-3 shrink-0 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tu nombre"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-400 transition-all font-semibold"
            required
          />
        </div>

        <div className="relative">
          <textarea
            rows={3}
            placeholder={isRecording ? "Escuchando... Habla ahora" : "Escribe una anotación o usa el dictado por voz..."}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className={`w-full text-xs px-2.5 py-2 rounded-lg border bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none pr-8 ${
              isRecording ? 'border-red-400 ring-1 ring-red-400/20 bg-red-50/5' : 'border-slate-200'
            }`}
            required
            disabled={isRecording}
          />
          <button
            type="button"
            onClick={toggleRecording}
            className={`absolute right-2.5 bottom-3.5 p-1 rounded-full border transition-all cursor-pointer ${
              isRecording 
                ? 'bg-red-500 text-white border-red-600 animate-pulse' 
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title={isRecording ? "Detener grabación de voz" : "Dictar comentario con voz"}
          >
            {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={!newComment.trim() || isRecording}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer select-none"
        >
          <Send className="h-3 w-3" />
          <span>Añadir Anotación</span>
        </button>
      </form>
    </div>
  );
}

export interface PresentationViewerProps {
  brand: {
    id: string;
    name: string;
    logo_path?: string | null;
  };
  blocks: BrandBlock[];
  candidates: NamingCandidate[];
  rules: Rule[];
  knowledgeItems: KnowledgeItem[];
  onClose?: () => void;
  initialSlide?: number;
}

export function PresentationViewer({
  brand,
  blocks,
  candidates,
  rules,
  knowledgeItems,
  onClose,
  initialSlide = 0
}: PresentationViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const totalSlides = BLOCK_DEFINITIONS.length;

  const goNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (typeof document !== 'undefined') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
    }

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
        if (onClose) {
          onClose();
        }
        break;
    }
  }, [goNext, goPrev, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const blockDef = BLOCK_DEFINITIONS[currentSlide];
  const brandBlock = blocks.find(b => b.block_id === blockDef.id);
  const stage = STAGES.find(s => s.key === blockDef.stage);
  const content = brandBlock?.content_md || '';

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col bg-white ${isDarkMode ? '' : 'presentation-light-theme'}`}>
      {/* Top Progress Line (13 segments representing block validation progress) */}
      <div className={`flex h-2.5 w-full shrink-0 border-b ${isDarkMode ? 'bg-slate-950 border-slate-900' : 'bg-slate-200 border-slate-300'}`}>
        {BLOCK_DEFINITIONS.map((def, idx) => {
          const block = blocks.find(b => b.block_id === def.id);
          const status = block?.status || 'vacio';
          const stage = STAGES.find(s => s.key === def.stage);
          
          let statusColor = isDarkMode ? '#1f2937' : '#e2e8f0'; // Default dark grey / light grey for 'vacio'
          let statusLabel = 'Vacío';

          if (status === 'validado') {
            statusColor = stage?.color || '#8B5CF6';
            statusLabel = 'Validado';
          } else if (status === 'en_revision') {
            statusColor = '#94a3b8'; // Grey (slate-400)
            statusLabel = 'En revisión';
          } else if (status === 'borrador') {
            statusColor = '#4b5563'; // Slightly darker grey (gray-600)
            statusLabel = 'Borrador';
          }

          const isCurrent = idx === currentSlide;

          return (
            <button 
              key={def.id}
              onClick={() => setCurrentSlide(idx)}
              className={`flex-1 h-full transition-all duration-200 cursor-pointer hover:brightness-125 hover:opacity-100 ${
                isCurrent ? 'ring-1 ring-white/30 brightness-110 z-10' : 'opacity-90'
              }`}
              style={{
                backgroundColor: statusColor,
                borderRight: idx < 12 ? (isDarkMode ? '1px solid rgba(0, 0, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.6)') : 'none'
              }}
              title={`${def.id}. ${def.title} (${statusLabel})`}
            />
          );
        })}
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3 font-sans">
        <div className="flex items-center gap-3">
          {(() => {
            const Icon = stageIcons[blockDef.stage];
            return Icon ? (
              <Icon className="h-4.5 w-4.5 shrink-0" style={{ color: stage?.color || '#8B5CF6' }} />
            ) : (
              <span className="font-bold text-xs shrink-0" style={{ color: stage?.color || '#8B5CF6' }}>{blockDef.stage}</span>
            );
          })()}
          <span className="text-sm md:text-base font-bold uppercase tracking-wider" style={{ color: stage?.color || '#8B5CF6' }}>
            {stage?.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Comments Toggle Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center justify-center p-1.5 rounded-lg border transition-all cursor-pointer select-none ${
              showComments
                ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
            }`}
            title={showComments ? "Ocultar anotaciones" : "Mostrar anotaciones"}
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors cursor-pointer select-none"
            title={isDarkMode ? "Cambiar a modo día (tema claro)" : "Cambiar a modo noche (tema oscuro)"}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {onClose ? (
            <>
              <span className="font-mono text-sm font-medium text-slate-450">
                {currentSlide + 1} / {totalSlides}
              </span>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                title="Salir de presentación (ESC)"
              >
                <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                <span>Volver al Panel</span>
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-slate-500">{brand.name}</span>
              <span className="font-mono text-sm font-medium text-slate-450">
                {currentSlide + 1} / {totalSlides}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main presentation body with side-by-side Slide + Comments */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide content */}
        <div className="flex-1 overflow-y-auto px-16 py-12 flex justify-center items-start">
          <div className="w-full max-w-6xl my-auto">
          {/* Title with Number */}
          <h1 className="mb-3 text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-baseline gap-3">
            <span
              className="font-mono select-none shrink-0"
              style={{ color: stage?.color || '#8B5CF6' }}
            >
              {blockDef.id < 10 ? `0${blockDef.id}` : blockDef.id}
            </span>
            <span className="font-bold">
              {blockDef.title}
            </span>
          </h1>

          {/* Description */}
          <p className="mb-8 text-base text-slate-400 leading-relaxed font-medium">{blockDef.description}</p>

          {/* Content */}
          <div className="pr-2">
            {blockDef.id === 2 ? (
              <PresentationValueProp content={content} />
            ) : blockDef.id === 3 ? (
              <PresentationNamingLab content={content} candidates={candidates} />
            ) : blockDef.id === 4 ? (
              <div className="flex flex-col items-center mt-4 w-full">
                {(() => {
                  const cleanContent = cleanBlock4Content(content);
                  
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
                        {preprocessMarkdown(cleanContent)
                          .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                          .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                      </ReactMarkdown>
                    </div>
                  ) : null;
                })()}
                <div className="w-full flex justify-center mt-2">
                  <PresentationArchetypeWheel content={content} isDarkMode={isDarkMode} />
                </div>
              </div>
            ) : blockDef.id === 5 ? (
              <PresentationVoiceTensions content={content} />
            ) : blockDef.id === 6 ? (
              <PresentationVerbalIdentity content={content} isDarkMode={isDarkMode} />
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
                        {preprocessMarkdown(cleanContent)
                          .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                          .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                      </ReactMarkdown>
                    </div>
                  ) : null;
                })()}

                {/* Logo and colors block */}
                {brand.logo_path && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-slate-100 pt-6">
                    <div className="flex flex-col items-center justify-center p-4 border border-slate-100 rounded-xl shadow-sm aspect-square h-[180px] w-[180px] shrink-0" style={{ backgroundColor: '#ffffff' }}>
                      <img src={brand.logo_path} alt="Logo" className="max-h-full max-w-full object-contain" />
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
                          <p className="text-[11px] text-slate-650 leading-relaxed mt-1 font-sans">{analysis.conclusion}</p>
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
            ) : blockDef.id === 10 ? (
              <PresentationKnowledgeLibrary items={knowledgeItems} />
            ) : blockDef.id === 11 ? (
              <PresentationRules rules={rules} kind="linea_roja" />
            ) : blockDef.id === 12 ? (
              <PresentationRules rules={rules} kind="protocolo_incidencia" />
            ) : blockDef.id === 13 ? (
              <PresentationRules rules={rules} kind="instruccion_ia" />
            ) : content.trim() ? (
              <div className="markdown-preview max-w-3xl mx-auto">
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
                  {preprocessMarkdown(content)
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

      {/* Comments Sidebar Panel */}
        <div 
          className={`border-l border-slate-100 flex flex-col shrink-0 transition-all duration-300 ${
            showComments ? 'w-[360px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
          }`}
        >
          {showComments && (
            <PresentationComments
              key={`${brand.id}-${blockDef.id}`}
              brandId={brand.id}
              blockId={blockDef.id}
              isAuthorized={!!onClose}
            />
          )}
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
          {BLOCK_DEFINITIONS.map((def, i) => {
            const slideStage = STAGES.find(s => s.key === def.stage);
            const isActive = i === currentSlide;
            return (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  isActive ? 'w-4' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                }`}
                style={isActive ? { backgroundColor: slideStage?.color || '#8B5CF6' } : undefined}
              />
            );
          })}
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

export function Presentation() {
  const { activeBrand } = useBrand();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [blocks, setBlocks] = useState<BrandBlock[]>([]);
  const [candidates, setCandidates] = useState<NamingCandidate[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);

  useEffect(() => {
    if (!activeBrand) {
      setBlocks([]);
      setCandidates([]);
      setRules([]);
      setKnowledgeItems([]);
      return;
    }
    let cancelled = false;
    async function loadData() {
      try {
        const [blocksData, candidatesData, rulesData, knowledgeData] = await Promise.all([
          db.getBrandBlocks(activeBrand!.id),
          db.getNamingCandidates(activeBrand!.id),
          db.getRules(activeBrand!.id),
          db.getKnowledgeItems(activeBrand!.id),
        ]);
        if (!cancelled) {
          setBlocks(blocksData);
          setCandidates(candidatesData);
          setRules(rulesData);
          setKnowledgeItems(knowledgeData);
        }
      } catch (err) {
        console.error('[Presentation] Failed to load brand data:', err);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [activeBrand]);

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
    return (
      <PresentationViewer
        brand={activeBrand}
        blocks={blocks}
        candidates={candidates}
        rules={rules}
        knowledgeItems={knowledgeItems}
        onClose={() => setIsFullscreen(false)}
        initialSlide={currentSlide}
      />
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
