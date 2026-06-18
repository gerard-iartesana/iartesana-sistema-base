'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Plus, Copy, Check, ToggleLeft, ToggleRight, Trash2, Lock, ExternalLink } from 'lucide-react';
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import type { ShareLink } from '@/lib/db/types';

export function LiveLink() {
  const { activeBrand } = useBrand();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'lectura' | 'presentacion'>('presentacion');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeBrand) {
      setLinks([]);
      return;
    }
    try {
      const data = await db.getShareLinks(activeBrand.id);
      setLinks(data);
    } catch (error) {
      console.error('Failed to load share links:', error);
    }
  }, [activeBrand]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!activeBrand || !password.trim()) return;
    await db.createShareLink({
      brand_id: activeBrand.id,
      password_hash: password.trim(),
      mode: mode,
    });
    setPassword('');
    setMode('presentacion');
    setShowCreateForm(false);
    await load();
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    if (!currentActive) {
      // Re-activating is not supported via deactivateShareLink
      // For now, we just deactivate
      return;
    }
    await db.deactivateShareLink(id);
    await load();
  };

  const handleDeactivate = async (id: string) => {
    await db.deactivateShareLink(id);
    await load();
  };

  const handleCopyLink = (linkId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/share/${linkId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(linkId);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  if (!activeBrand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Link2 className="mb-3 h-10 w-10 text-slate-200" />
        <p className="text-sm text-slate-400">Selecciona una marca para gestionar enlaces</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Live Links</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Enlaces protegidos con contraseña para compartir el documento
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo enlace
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="border-b border-slate-200 bg-slate-50 p-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Contraseña de acceso</label>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                <Lock className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña para este enlace"
                  className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Los visitantes necesitarán esta contraseña para acceder.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo de Enlace (Modo)</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as any)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              <option value="presentacion">Presentación de diapositivas</option>
              <option value="lectura">Lectura del documento</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={!password.trim()}
              className="rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Crear enlace
            </button>
            <button
              onClick={() => { setShowCreateForm(false); setPassword(''); setMode('presentacion'); }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Link2 className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">Aún no hay enlaces compartidos</p>
          <p className="mt-1 text-xs text-slate-300">Crea un enlace protegido con contraseña</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {links.map(link => {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const url = `${baseUrl}/share/${link.id}`;
            return (
              <div key={link.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/50">
                {/* Active indicator */}
                <span className={`h-2 w-2 shrink-0 rounded-full ${link.active ? 'bg-emerald-400' : 'bg-slate-300'}`} />

                {/* Link info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="truncate font-mono text-xs text-slate-500">{url}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                    <span>Modo: {link.mode}</span>
                    <span>•</span>
                    <span>{link.active ? 'Activo' : 'Inactivo'}</span>
                    <span>•</span>
                    <span>Creado: {new Date(link.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {/* Copy button */}
                  <button
                    onClick={() => handleCopyLink(link.id)}
                    className="rounded-md border border-slate-200 p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    title="Copiar enlace"
                  >
                    {copyFeedback === link.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Toggle active */}
                  {link.active ? (
                    <button
                      onClick={() => handleDeactivate(link.id)}
                      className="rounded-md p-1.5 text-emerald-500 transition-colors hover:bg-emerald-50"
                      title="Desactivar"
                    >
                      <ToggleRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <span
                      className="rounded-md p-1.5 text-slate-400"
                      title="Inactivo"
                    >
                      <ToggleLeft className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
