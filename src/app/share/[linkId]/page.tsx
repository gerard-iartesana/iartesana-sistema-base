'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db/local-storage';
import { Brand, BrandBlock, Marker, NamingCandidate, Rule, KnowledgeItem } from '@/lib/db/types';
import { BLOCK_DEFINITIONS, STAGES } from '@/lib/data/block-definitions';
import { Lock, Eye, AlertTriangle, Star, Trophy, X, Sparkles, Info, Target, Award, CheckCircle2, ShieldAlert, BookOpen, Ban, ChevronLeft, ChevronRight, MessageSquare, Users, Shield } from 'lucide-react';
import { splitNamingRationale, splitBlock3Content } from '@/lib/utils/naming-content';
import { getClosestColorName } from '@/components/blocks/visual-lab';
import {
  parseSavedColors,
  parseSavedAnalysis,
  parseSavedVariants,
  splitBlock7Content
} from '@/lib/utils/visual-content';
import { parseVoiceTensions, splitBlock5Content } from '@/lib/utils/voice-content';
import { parseVerbalIdentity, splitBlock6Content } from '@/lib/utils/verbal-content';
import { parseValueProposition, parseValuesList } from '@/lib/utils/valprop-content';
import ReactMarkdown from 'react-markdown';
import { ARCHETYPES, CATEGORY_COLORS, ICON_PATHS, parseArchetypes } from '@/components/blocks/archetype-lab';

const stageIcons: Record<string, React.ComponentType<any>> = {
  'A': Sparkles,
  'B': MessageSquare,
  'C': Users,
  'D': Shield,
};

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
      <div className="flex flex-col items-start gap-2 mt-5 mb-3 select-none">
        <img
          src={iconSrc}
          alt={text}
          className="w-10 h-10 opacity-60 object-contain"
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
      <div className="mt-6 mb-4 first:mt-2">
        <div className="flex items-center gap-2 mb-1.5 select-none">
          <img
            src={match.iconSrc}
            alt={match.sectionTitle}
            className="w-8 h-8 opacity-60 object-contain shrink-0"
          />
          <span className="text-lg font-bold tracking-tight text-slate-800 uppercase">
            {match.sectionTitle}
          </span>
        </div>
        <p className="text-base leading-relaxed pl-[40px] text-slate-600 m-0">
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
      <li className="list-none mt-6 mb-4 first:mt-2">
        <div className="flex items-center gap-2 mb-1.5 select-none">
          <img
            src={match.iconSrc}
            alt={match.sectionTitle}
            className="w-8 h-8 opacity-60 object-contain shrink-0"
          />
          <span className="text-lg font-bold tracking-tight text-slate-800 uppercase">
            {match.sectionTitle}
          </span>
        </div>
        <p className="text-base leading-relaxed pl-[40px] text-slate-600 m-0">
          {match.cleanedChildren}
        </p>
      </li>
    );
  }
  return <li {...props}>{children}</li>;
};

function SharePageArchetypeWheel({ content }: { content: string }) {
  console.log('[SharePageArchetypeWheel] content:', JSON.stringify(content));
  const selected = parseArchetypes(content);
  console.log('[SharePageArchetypeWheel] selected:', selected);

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

function SharePageValueProp({ content }: { content: string }) {
  const { mission, vision, values } = parseValueProposition(content);
  const valuesList = parseValuesList(values);

  const hasContent = mission.trim() || vision.trim() || valuesList.length > 0;

  if (!hasContent) {
    return <p className="text-slate-400 italic text-sm">Sin contenido</p>;
  }

  return (
    <div className="space-y-6 w-full mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mission Card */}
        {mission.trim() && (
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 select-none">
              <Target className="h-5 w-5 text-violet-500" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Misión</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-sans">{mission}</p>
          </div>
        )}

        {/* Vision Card */}
        {vision.trim() && (
          <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 select-none">
              <Eye className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Visión</span>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-sans">{vision}</p>
          </div>
        )}
      </div>

      {/* Values Section */}
      {valuesList.length > 0 && (
        <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 select-none">
            <Award className="h-5 w-5 text-emerald-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Valores de Marca</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {valuesList.map((val, idx) => (
              <div key={idx} className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border-0">
                <span className="text-lg font-bold text-slate-800 block mb-1.5">{val.title}</span>
                {val.text && <p className="text-sm text-slate-600 leading-relaxed font-sans">{val.text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SharePageKnowledgeLibrary({ items }: { items: KnowledgeItem[] }) {
  if (items.length === 0) {
    return <p className="text-slate-400 italic text-sm">No hay ítems en la Biblioteca de Conocimiento.</p>;
  }

  const kindConfig: Record<string, { label: string; badgeClass: string }> = {
    recomendacion: { label: 'Recomendación', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    faq: { label: 'FAQ', badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
    politica: { label: 'Política', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    normativa: { label: 'Normativa', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      {items.map((item) => {
        const config = kindConfig[item.kind] || { label: item.kind, badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
        return (
          <div key={item.id} className="flex flex-col border border-slate-200 rounded-xl p-5 bg-slate-50/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${config.badgeClass}`}>
                {config.label}
              </span>
              {item.audience && (
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50 truncate max-w-[120px]" title={item.audience}>
                  Público: {item.audience}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-2 leading-snug">{item.title}</h4>
            <div className="text-xs text-slate-600 leading-relaxed font-sans flex-1">
              <ReactMarkdown>{item.body_md}</ReactMarkdown>
            </div>
            {item.verified && (
              <div className="mt-4 border-t border-slate-150/40 pt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 select-none">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Verificado</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SharePageRules({ rules, kind }: { rules: Rule[]; kind: 'linea_roja' | 'protocolo_incidencia' | 'instruccion_ia' }) {
  const blockRules = rules.filter(r => r.kind === kind).sort((a, b) => a.sort - b.sort);

  if (blockRules.length === 0) {
    return <p className="text-slate-400 italic text-sm">No hay reglas definidas para este bloque.</p>;
  }

  const kindConfig = {
    linea_roja: {
      colorClass: 'text-red-400',
      borderClass: 'border-red-500/25',
      bgClass: 'bg-red-500/5',
      icon: <Ban className="h-4.5 w-4.5 text-red-400" />
    },
    protocolo_incidencia: {
      colorClass: 'text-amber-400',
      borderClass: 'border-amber-500/25',
      bgClass: 'bg-amber-500/5',
      icon: <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
    },
    instruccion_ia: {
      colorClass: 'text-violet-400',
      borderClass: 'border-violet-500/25',
      bgClass: 'bg-violet-500/5',
      icon: <BookOpen className="h-4.5 w-4.5 text-violet-400" />
    }
  };

  const config = kindConfig[kind];

  return (
    <div className="space-y-3 mt-4">
      {blockRules.map((rule, idx) => (
        <div key={rule.id} className={`flex gap-3 border rounded-xl p-4 bg-slate-50/50 shadow-sm ${config.borderClass}`}>
          <div className="flex flex-col items-center shrink-0">
            <span className="font-mono text-base font-black text-slate-400/80">{(idx + 1).toString().padStart(2, '0')}</span>
            <div className="mt-1.5">{config.icon}</div>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed font-sans pt-0.5">
            <ReactMarkdown>{rule.body_md}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}

function SharePageVoiceTensions({ content }: { content: string }) {
  const { rawMarkdown, tensions } = splitBlock5Content(content);

  return (
    <div className="space-y-6 w-full mt-4 animate-fade-in">
      {/* Intro Description */}
      {rawMarkdown && (
        <div className="markdown-preview max-w-none text-slate-655 text-sm leading-relaxed">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
          {tensions.map((t, idx) => {
            const leftPercent = 100 - t.value;
            const rightPercent = t.value;
            
            return (
              <div key={idx} className="flex flex-col bg-slate-50/50 border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                {/* Labels and calculated percent */}
                <div className="flex justify-between items-baseline mb-2">
                  <span className={`text-sm font-bold transition-all ${leftPercent > 50 ? 'text-slate-800 font-extrabold' : 'text-slate-400 font-medium'}`}>
                    {t.left} {leftPercent > 50 && `(${leftPercent}%)`}
                  </span>
                  <span className={`text-sm font-bold transition-all ${rightPercent > 50 ? 'text-slate-800 font-extrabold' : 'text-slate-400 font-medium'}`}>
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
                <p className="text-xs text-slate-550 leading-relaxed font-sans mt-1.5 whitespace-pre-line">
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

function SharePageNamingLab({ content, candidates }: { content: string; candidates: NamingCandidate[] }) {
  const cleanContent = splitBlock3Content(content);

  return (
    <div className="space-y-8 w-full mt-4">
      {/* Intro Description */}
      {cleanContent && (
        <div className="markdown-preview max-w-none text-slate-600 leading-relaxed">
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
                cardStyle = 'border-slate-200 bg-slate-50';
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

                  {/* Veto Reason if discarded */}
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
                            <ul className="list-disc pl-3.5 text-slate-650 space-y-0.5 leading-snug">
                              {analysis.pros.slice(0, 2).map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                          </div>
                        )}
                        {analysis.contras?.length > 0 && (
                          <div className="bg-red-50/10 border border-red-100/40 rounded-lg p-2.5">
                            <span className="font-bold text-red-800 block mb-1 select-none">Contras</span>
                            <ul className="list-disc pl-3.5 text-slate-650 space-y-0.5 leading-snug">
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


const defaultVerbalImageMap: Record<string, string> = {
  voz_escrita: '/images/verbal_voz_escrita.png',
  tuteo: '/images/verbal_idiomas.png',
  usamos: '/images/verbal_glosario_usamos.png',
  evitar: '/images/verbal_glosario_evitar.png',
};

function SharePageVerbalIdentity({ content }: { content: string }) {
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
        const imageSrc = images[sectionKey] || images[section.type] || defaultVerbalImageMap[section.type];
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
                          <span className="text-xs text-slate-300 leading-relaxed block mt-1 font-sans">{item.definition}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-300 leading-relaxed text-sm font-sans space-y-3">
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
                className="w-full h-auto object-contain aspect-square mix-blend-multiply opacity-80"
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
                <div className="text-slate-300 leading-relaxed text-sm font-sans">
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

export default function SharePage() {
  const params = useParams();
  const linkId = params.linkId as string;

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [brand, setBrand] = useState<Brand | null>(null);
  const [blocks, setBlocks] = useState<BrandBlock[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [candidates, setCandidates] = useState<NamingCandidate[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [linkMode, setLinkMode] = useState<'lectura' | 'presentacion'>('lectura');
  const [currentSlide, setCurrentSlide] = useState(0);

  const goNext = () => {
    setCurrentSlide(prev => Math.min(prev + 1, BLOCK_DEFINITIONS.length - 1));
  };

  const goPrev = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (linkMode !== 'presentacion' || !authenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [linkMode, authenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Get share link from localStorage
    const links = await db.getShareLinks('');
    // Search across all share links
    const allBrands = await db.getBrands();
    let foundLink = null;
    let foundBrand = null;

    for (const b of allBrands) {
      const brandLinks = await db.getShareLinks(b.id);
      const link = brandLinks.find(l => l.id === linkId && l.active);
      if (link) {
        foundLink = link;
        foundBrand = b;
        break;
      }
    }

    if (!foundLink || !foundBrand) {
      setError('Enlace no encontrado o desactivado');
      return;
    }

    // Simple password check (in production this would be bcrypt via Edge Function)
    if (password !== foundLink.password_hash) {
      setError('Contraseña incorrecta');
      return;
    }

    setBrand(foundBrand);
    setLinkMode(foundLink.mode || 'lectura');
    const [b, m, c, r, k] = await Promise.all([
      db.getBrandBlocks(foundBrand.id),
      db.getMarkers(foundBrand.id),
      db.getNamingCandidates(foundBrand.id),
      db.getRules(foundBrand.id),
      db.getKnowledgeItems(foundBrand.id),
    ]);
    setBlocks(b);
    setMarkers(m);
    setCandidates(c);
    setRules(r);
    setKnowledgeItems(k);
    setAuthenticated(true);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50 to-slate-100">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 shadow-lg shadow-violet-200 mb-3">
              <Lock className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Documento protegido</h1>
            <p className="text-sm text-slate-500 mt-1">Introduce la contraseña para acceder</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  required
                  autoFocus
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm border border-red-100">
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 text-white font-medium hover:from-violet-700 hover:to-violet-800 transition-all shadow-sm"
              >
                <Eye size={18} />
                Acceder
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!brand) return null;

  const openMarkers = markers.filter(m => !m.resolved);

  if (linkMode === 'presentacion') {
    const blockDef = BLOCK_DEFINITIONS[currentSlide];
    const brandBlock = blocks.find(b => b.block_id === blockDef.id);
    const stage = STAGES.find(s => s.key === blockDef.stage);
    const content = brandBlock?.content_md || '';
    const totalSlides = BLOCK_DEFINITIONS.length;

    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white">
        {/* Top Progress Line (13 segments representing block validation progress) */}
        <div className="flex h-2.5 w-full bg-slate-950 shrink-0 border-b border-slate-900">
          {BLOCK_DEFINITIONS.map((def, idx) => {
            const block = blocks.find(b => b.block_id === def.id);
            const status = block?.status || 'vacio';
            const stage = STAGES.find(s => s.key === def.stage);
            
            let statusColor = '#1f2937'; // Default dark grey for 'vacio'
            let statusLabel = 'Vacío';

            if (status === 'validado') {
              statusColor = stage?.color || '#8B5CF6';
              statusLabel = 'Validado';
            } else if (status === 'en_revision') {
              statusColor = '#94a3b8'; // Grey
              statusLabel = 'En revisión';
            } else if (status === 'borrador') {
              statusColor = '#4b5563'; // Slightly darker grey
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
                  borderRight: idx < 12 ? '1px solid rgba(0, 0, 0, 0.4)' : 'none'
                }}
                title={`${def.id}. ${def.title} (${statusLabel})`}
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
            <span className="text-sm md:text-base font-bold uppercase tracking-wider" style={{ color: stage?.color || '#8B5CF6' }}>
              {stage?.label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-500">{brand.name}</span>
            <span className="font-mono text-sm font-medium text-slate-400">
              {currentSlide + 1} / {totalSlides}
            </span>
          </div>
        </div>

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
                <SharePageValueProp content={content} />
              ) : blockDef.id === 3 ? (
                <SharePageNamingLab content={content} candidates={candidates} />
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
                          {preprocessMarkdown(cleanContent)
                            .replace(/\[pendiente:\s*([^\]]+)\]/gi, '[⏳ PENDIENTE: $1](#marker-pendiente)')
                            .replace(/\[verificar:\s*([^\]]+)\]/gi, '[⚠️ VERIFICAR: $1](#marker-verificar)')}
                        </ReactMarkdown>
                      </div>
                    ) : null;
                  })()}
                  <div className="w-full flex justify-center mt-2">
                    <SharePageArchetypeWheel content={content} />
                  </div>
                </div>
              ) : blockDef.id === 5 ? (
                <SharePageVoiceTensions content={content} />
              ) : blockDef.id === 6 ? (
                <SharePageVerbalIdentity content={content} />
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
                      <div className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-xl bg-slate-50 shadow-sm aspect-video max-h-[180px]">
                        <img src={brand.logo_path} alt="Logo" className="max-h-[130px] object-contain" />
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
                                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full py-1 pl-1.5 pr-3.5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="h-6.5 w-6.5 rounded-full border border-slate-350 shadow-inner shrink-0" style={{ backgroundColor: hex }} />
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-800 leading-none uppercase font-mono">{hex}</span>
                                      <span className="text-[8.5px] text-slate-500 font-semibold leading-none mt-0.5 truncate max-w-[100px]" title={nameRole.name}>{nameRole.name}</span>
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
                      <div className="mt-6 border-t border-slate-150 pt-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none block mb-3">Variantes Alternativas de la Marca</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {variantsList.map(v => (
                            <div key={v.id} className="flex flex-col items-center gap-2 p-3.5 border border-slate-200 rounded-xl bg-slate-50 shadow-sm">
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
                      <div className="mt-8 border-t border-slate-150 pt-6">
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
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold self-start shadow-sm select-none">
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
                              <div key={p.id} className="bg-slate-50/50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between hover:border-slate-350 transition-colors">
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
                        <div className="mt-4 border border-slate-200 bg-slate-50 p-4 rounded-lg flex gap-3 items-start">
                          <Info className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block">Dictamen del Auditor</span>
                            <p className="text-[11px] text-slate-655 leading-relaxed mt-1 font-sans">{analysis.conclusion}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Grid gallery of saved mockups */}
                  {(() => {
                    const savedList = Object.entries(parseSavedMockups(content)).filter(([_, val]) => !!val);
                    if (savedList.length === 0) return null;

                    const labels: Record<string, string> = {
                      card: 'Tarjeta comercial',
                      mobile: 'Interfaz móvil',
                      letter: 'Papel membretado A4',
                      tshirt: 'Camiseta de marca',
                      tote: 'Bolso tote de algodón'
                    };

                    return (
                      <div className="mt-8 border-t border-slate-150 pt-6">
                        <div className="flex flex-col gap-1.5 mb-4 select-none">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visualización en Formatos</span>
                          <p className="text-[10.5px] text-slate-500 leading-none">Formatos publicitarios y papelería corporativa generados para la marca.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                          {savedList.map(([key, base64]) => {
                            const label = labels[key] || key;
                            return (
                              <div key={key} className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none px-0.5">{label}</span>
                                <div className="overflow-hidden rounded-lg shadow-md aspect-[16/10] flex justify-center items-center bg-transparent border border-slate-200">
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
              ) : blockDef.id === 10 ? (
                <SharePageKnowledgeLibrary items={knowledgeItems} />
              ) : blockDef.id === 11 ? (
                <SharePageRules rules={rules} kind="linea_roja" />
              ) : blockDef.id === 12 ? (
                <SharePageRules rules={rules} kind="protocolo_incidencia" />
              ) : blockDef.id === 13 ? (
                <SharePageRules rules={rules} kind="instruccion_ia" />
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <span className="text-xs font-bold text-white">iA</span>
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Núcleo de Contexto
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">{brand.name}</h1>
          <p className="text-sm text-slate-500 mt-2">
            Versión {brand.doc_version} · Modo lectura
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        {STAGES.map(stage => {
          const stageBlocks = BLOCK_DEFINITIONS.filter(d => d.stage === stage.key);
          return (
            <div key={stage.key} className="mb-12">
              <h2
                className="text-xl font-bold mb-6 pb-2 border-b-2"
                style={{ borderColor: stage.color, color: stage.color }}
              >
                {stage.key}. {stage.label}
              </h2>
              {stageBlocks.map(def => {
                const block = blocks.find(b => b.block_id === def.id);
                const blockMarkers = openMarkers.filter(m => m.block_id === def.id);
                return (
                  <div key={def.id} className="mb-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-mono text-lg font-black tracking-tight" style={{ color: stage.color }}>
                          {def.id < 10 ? `0${def.id}` : def.id}
                        </span>
                        <h3 className="text-base font-bold text-slate-800">
                          {def.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                        {stage.label}
                      </span>
                    </div>
                    {/* Description */}
                    <p className="text-xs text-slate-400 font-medium mb-5 leading-normal">{def.description}</p>
                    {blockMarkers.length > 0 && (
                      <div className="mb-4 space-y-1.5">
                        {blockMarkers.map(m => (
                          <div
                            key={m.id}
                            className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                              m.type === 'pendiente'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                : 'bg-red-500/10 text-red-400 border-red-500/25'
                            }`}
                          >
                            <AlertTriangle size={13} className="shrink-0" />
                            <span className="font-bold uppercase tracking-wider text-[9px]">{m.type}:</span>
                            <span>{m.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(() => {
                      if (def.id === 2) {
                        return <SharePageValueProp content={block?.content_md || ''} />;
                      }
                      if (def.id === 3) {
                        return (
                          <SharePageNamingLab content={block?.content_md || ''} candidates={candidates} />
                        );
                      }
                      if (def.id === 4) {
                        const cleanContent = block?.content_md
                          ? block.content_md
                            .replace(/^### Arquetipos Seleccionados\s*\n?/gi, '')
                            .replace(/^(?:[\*\-]\s*)?\*\*(La\s+[^*]+?)\*\*\:\s*\d+\s*%\s*\n?/gim, '')
                            .replace(/^---\s*\n?/gi, '')
                            .trim()
                          : '';

                        return (
                          <div className="space-y-4">
                            {cleanContent && (
                              <div className="markdown-preview text-slate-655 leading-relaxed text-sm">
                                <ReactMarkdown>{cleanContent}</ReactMarkdown>
                              </div>
                            )}
                            <div className="w-full flex justify-center mt-6">
                              <SharePageArchetypeWheel content={block?.content_md || ''} />
                            </div>
                          </div>
                        );
                      }
                      if (def.id === 5) {
                        return <SharePageVoiceTensions content={block?.content_md || ''} />;
                      }
                      if (def.id === 7) {
                        const visualContent = block?.content_md ? splitBlock7Content(block.content_md) : { rawMarkdown: '' };
                        const saved = block?.content_md ? parseSavedMockups(block.content_md) : {};
                        const savedList = Object.entries(saved).filter(([_, val]) => !!val);

                        const labels: Record<string, string> = {
                          card: 'Tarjeta comercial',
                          mobile: 'Interfaz móvil',
                          letter: 'Papel membretado A4',
                          tshirt: 'Camiseta de marca',
                          tote: 'Bolso tote de algodón'
                        };

                        const colors = block?.content_md ? parseSavedColors(block.content_md) : [];
                        const variantsList = block?.content_md ? parseSavedVariants(block.content_md) : [];
                        const analysis = block?.content_md ? parseSavedAnalysis(block.content_md) : null;

                        return (
                          <div className="space-y-6 w-full">
                            {visualContent.rawMarkdown.trim() && (
                              <div className="markdown-preview text-slate-655 text-sm leading-relaxed">
                                <ReactMarkdown>{visualContent.rawMarkdown}</ReactMarkdown>
                              </div>
                            )}

                            {/* Logo and colors block */}
                            {brand.logo_path && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border-t border-slate-100 pt-6">
                                <div className="flex flex-col items-center justify-center p-6 border border-slate-200 rounded-xl bg-slate-50 shadow-sm aspect-video max-h-[180px]">
                                  <img src={brand.logo_path} alt="Logo" className="max-h-[130px] object-contain" />
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">Paleta de Colores Corporativos</span>
                                  {colors.length === 0 ? (
                                    <span className="text-xs text-slate-400 italic">No hay colores guardados en la paleta.</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-2.5">
                                      {colors.map((hex, idx) => {
                                        const nameRole = getClosestColorName(hex);
                                        return (
                                          <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full py-1 pl-1.5 pr-3.5 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="h-6.5 w-6.5 rounded-full border border-slate-350 shadow-inner shrink-0" style={{ backgroundColor: hex }} />
                                            <div className="flex flex-col">
                                              <span className="text-[11px] font-bold text-slate-800 leading-none uppercase font-mono">{hex}</span>
                                              <span className="text-[8.5px] text-slate-500 font-semibold leading-none mt-0.5 truncate max-w-[100px]" title={nameRole.name}>{nameRole.name}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Alternative logo variants block */}
                            {variantsList.length > 0 && (
                              <div className="mt-6 border-t border-slate-150 pt-6">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none block mb-3">Variantes Alternativas de la Marca</span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                  {variantsList.map(v => (
                                    <div key={v.id} className="flex flex-col items-center gap-2 p-3.5 border border-slate-200 rounded-xl bg-slate-50 shadow-sm">
                                      <div className="h-16 w-full flex items-center justify-center overflow-hidden shrink-0">
                                        <img src={v.base64} alt={v.name} className="max-h-full object-contain" />
                                      </div>
                                      <span className="text-[9.5px] font-bold text-slate-700 text-center truncate w-full" title={v.name}>{v.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 15 Parameters Audit Section */}
                            {analysis && (
                              <div className="mt-8 border-t border-slate-150 pt-6">
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
                                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold self-start shadow-sm select-none">
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
                                      <div key={p.id} className="bg-slate-50/50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between hover:border-slate-350 transition-colors">
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
                                <div className="mt-4 border border-slate-200 bg-slate-50 p-4 rounded-lg flex gap-3 items-start">
                                  <Info className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-xs font-bold text-slate-800 block">Dictamen del Auditor</span>
                                    <p className="text-[11px] text-slate-655 leading-relaxed mt-1 font-sans">{analysis.conclusion}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Grid gallery of saved mockups */}
                            {savedList.length > 0 && (
                              <div className="mt-8 border-t border-slate-150 pt-6">
                                <div className="flex flex-col gap-1.5 mb-4 select-none animate-fade-in">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visualización en Formatos</span>
                                  <p className="text-[10.5px] text-slate-500 leading-none">Formatos publicitarios y papelería corporativa generados para la marca.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-8">
                                  {savedList.map(([key, base64]) => {
                                    const label = labels[key] || key;
                                    return (
                                      <div key={key} className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none px-0.5">{label}</span>
                                        <div className="overflow-hidden rounded-lg shadow-md aspect-[16/10] flex justify-center items-center bg-transparent border border-slate-200">
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
                            )}
                          </div>
                        );
                      }
                      if (def.id === 10) {
                        return <SharePageKnowledgeLibrary items={knowledgeItems} />;
                      }
                      if (def.id === 11) {
                        return <SharePageRules rules={rules} kind="linea_roja" />;
                      }
                      if (def.id === 12) {
                        return <SharePageRules rules={rules} kind="protocolo_incidencia" />;
                      }
                      if (def.id === 13) {
                        return <SharePageRules rules={rules} kind="instruccion_ia" />;
                      }

                      // Default markdown rendering
                      const content = block?.content_md || '';
                      if (!content.trim()) {
                        return <p className="text-slate-400 italic text-sm">Sin contenido</p>;
                      }

                      return (
                        <div className="markdown-preview text-slate-655 text-sm leading-relaxed">
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
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Open markers table */}
        {openMarkers.length > 0 && (
          <div className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Huecos Abiertos ({openMarkers.length})
            </h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Bloque</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Tipo</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openMarkers.map(m => {
                    const def = BLOCK_DEFINITIONS.find(d => d.id === m.block_id);
                    return (
                      <tr key={m.id}>
                        <td className="px-4 py-2 text-slate-700">{def?.title || `Bloque ${m.block_id}`}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            m.type === 'pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-600">{m.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 mt-16">
        <div className="max-w-4xl mx-auto px-8 py-6 text-center">
          <p className="text-xs text-slate-400">
            Documento generado por iARTESANA — Sistema Base
          </p>
        </div>
      </footer>
    </div>
  );
}
