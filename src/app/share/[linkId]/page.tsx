'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db/local-storage';
import { Brand, BrandBlock, Marker } from '@/lib/db/types';
import { BLOCK_DEFINITIONS, STAGES } from '@/lib/data/block-definitions';
import { Lock, Eye, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ARCHETYPES, CATEGORY_COLORS, ICON_PATHS, parseArchetypes } from '@/components/blocks/archetype-lab';

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

export default function SharePage() {
  const params = useParams();
  const linkId = params.linkId as string;

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [brand, setBrand] = useState<Brand | null>(null);
  const [blocks, setBlocks] = useState<BrandBlock[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);

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
    const [b, m] = await Promise.all([
      db.getBrandBlocks(foundBrand.id),
      db.getMarkers(foundBrand.id),
    ]);
    setBlocks(b);
    setMarkers(m);
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
                  <div key={def.id} className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">
                      {def.id}. {def.title}
                    </h3>
                    {blockMarkers.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {blockMarkers.map(m => (
                          <div
                            key={m.id}
                            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                              m.type === 'pendiente'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            <AlertTriangle size={12} />
                            <span className="font-medium uppercase">{m.type}:</span>
                            <span>{m.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(() => {
                      if (!block?.content_md) {
                        return <p className="text-slate-400 italic text-sm">Sin contenido</p>;
                      }

                      let content = block.content_md;
                      let customElements = null;

                      if (def.id === 4) {
                        // Keep the full markdown content from the editor to show before the wheel
                        content = block.content_md;

                        customElements = (
                          <div className="w-full flex justify-center mt-6">
                            <SharePageArchetypeWheel content={block.content_md} />
                          </div>
                        );
                      } else if (def.id === 7) {
                        // 2. Clean markdown content of the mockups base64 image tags
                        content = cleanMarkdownMockups(content);

                        const saved = parseSavedMockups(block.content_md);
                        const savedList = Object.entries(saved).filter(([_, val]) => !!val);

                        const labels: Record<string, string> = {
                          card: 'Tarjeta comercial',
                          mobile: 'Interfaz móvil',
                          letter: 'Papel membretado A4',
                          tshirt: 'Camiseta de marca',
                          tote: 'Bolso tote de algodón'
                        };

                        if (savedList.length > 0) {
                          customElements = (
                            <div className="mt-8 border-t border-slate-100 pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        }
                      }

                      return (
                        <div className="space-y-4">
                          {content.trim() ? (
                            <div className="markdown-preview text-slate-600 leading-relaxed">
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
                            !customElements && <p className="text-slate-400 italic text-sm">Sin contenido</p>
                          )}
                          {customElements}
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
