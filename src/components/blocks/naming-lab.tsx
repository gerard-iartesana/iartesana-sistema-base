'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trophy, XCircle, Star, AlertCircle, Trash2 } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import type { NamingCandidate, NamingStatus } from '@/lib/db/types';

interface NamingLabProps {
  brandId: string;
}

const statusConfig: Record<NamingStatus, { label: string; icon: React.ReactNode; badgeClass: string; rowClass: string }> = {
  candidato: {
    label: 'Candidato',
    icon: <Star className="h-3 w-3" />,
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200',
    rowClass: '',
  },
  elegido: {
    label: 'Elegido',
    icon: <Trophy className="h-3 w-3" />,
    badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    rowClass: 'bg-emerald-50/50 border-l-2 border-l-emerald-400',
  },
  descartado: {
    label: 'Descartado',
    icon: <XCircle className="h-3 w-3" />,
    badgeClass: 'bg-slate-50 text-slate-400 border-slate-200',
    rowClass: 'opacity-60',
  },
};

export function NamingLab({ brandId }: NamingLabProps) {
  const [candidates, setCandidates] = useState<NamingCandidate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [vetoModal, setVetoModal] = useState<{ id: string } | null>(null);
  const [vetoReason, setVetoReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await db.getNamingCandidates(brandId);
      setCandidates(data);
    } catch (error) {
      console.error('Failed to load naming candidates:', error);
    }
  }, [brandId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await db.createNamingCandidate({
      brand_id: brandId,
      name: newName.trim(),
      rationale_md: newRationale.trim(),
    });
    setNewName('');
    setNewRationale('');
    setShowAddForm(false);
    await load();
  };

  const handleStatusChange = async (id: string, newStatus: NamingStatus) => {
    if (newStatus === 'descartado') {
      setVetoModal({ id });
      setVetoReason('');
      return;
    }
    await db.updateNamingCandidate(id, { status: newStatus, veto_reason: undefined });
    await load();
  };

  const handleVetoConfirm = async () => {
    if (!vetoModal || !vetoReason.trim()) return;
    await db.updateNamingCandidate(vetoModal.id, { status: 'descartado', veto_reason: vetoReason.trim() });
    setVetoModal(null);
    setVetoReason('');
    await load();
  };

  const handleDelete = async (id: string) => {
    await db.deleteNamingCandidate(id);
    setDeleteConfirm(null);
    await load();
  };

  const elegido = candidates.find(c => c.status === 'elegido');

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Laboratorio de Naming</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {candidates.length} candidato{candidates.length !== 1 ? 's' : ''}
            {elegido && (
              <span className="ml-2 text-emerald-600">• Elegido: <strong>{elegido.name}</strong></span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo candidato
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border-b border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nombre candidato"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Razonamiento</label>
              <input
                type="text"
                value={newRationale}
                onChange={e => setNewRationale(e.target.value)}
                placeholder="Significado, sonoridad, viabilidad…"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              Añadir candidato
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); setNewRationale(''); }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Star className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">Aún no hay candidatos de naming</p>
          <p className="mt-1 text-xs text-slate-300">Añade nombres candidatos para evaluar</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Nombre</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Razonamiento</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Razón de veto</th>
                <th className="w-10 px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => {
                const config = statusConfig[candidate.status];
                return (
                  <tr key={candidate.id} className={`border-b border-slate-100 ${config.rowClass} transition-colors hover:bg-slate-50/50`}>
                    <td className="px-4 py-2.5">
                      <span className={`text-sm font-medium ${candidate.status === 'elegido' ? 'text-emerald-700' : candidate.status === 'descartado' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {candidate.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-slate-500">{candidate.rationale_md || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.badgeClass}`}>
                          {config.icon}
                          {config.label}
                        </span>
                        {/* Status change buttons */}
                        <div className="ml-1 flex gap-0.5">
                          {candidate.status !== 'elegido' && (
                            <button
                              onClick={() => handleStatusChange(candidate.id, 'elegido')}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-500"
                              title="Elegir"
                            >
                              <Trophy className="h-3 w-3" />
                            </button>
                          )}
                          {candidate.status !== 'candidato' && (
                            <button
                              onClick={() => handleStatusChange(candidate.id, 'candidato')}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500"
                              title="Volver a candidato"
                            >
                              <Star className="h-3 w-3" />
                            </button>
                          )}
                          {candidate.status !== 'descartado' && (
                            <button
                              onClick={() => handleStatusChange(candidate.id, 'descartado')}
                              className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                              title="Descartar"
                            >
                              <XCircle className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-red-500 italic">{candidate.veto_reason || '—'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {deleteConfirm === candidate.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(candidate.id)} className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600">Sí</button>
                          <button onClick={() => setDeleteConfirm(null)} className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100">No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(candidate.id)}
                          className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Veto reason modal */}
      {vetoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h4 className="text-sm font-semibold text-slate-800">Razón de descarte</h4>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Indica por qué se descarta este candidato. Es obligatorio para mantener el registro.
            </p>
            <textarea
              value={vetoReason}
              onChange={e => setVetoReason(e.target.value)}
              placeholder="Ej: Nombre ya registrado en el mercado alemán…"
              className="mb-3 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setVetoModal(null); setVetoReason(''); }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleVetoConfirm}
                disabled={!vetoReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
