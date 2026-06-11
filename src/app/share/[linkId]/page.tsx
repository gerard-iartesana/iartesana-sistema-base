'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/db/local-storage';
import { Brand, BrandBlock, Marker } from '@/lib/db/types';
import { BLOCK_DEFINITIONS, STAGES } from '@/lib/data/block-definitions';
import { Lock, Eye, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
                    {block?.content_md ? (
                      <div className="markdown-preview text-slate-600 leading-relaxed">
                        <ReactMarkdown>{block.content_md}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-sm">Sin contenido</p>
                    )}
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
