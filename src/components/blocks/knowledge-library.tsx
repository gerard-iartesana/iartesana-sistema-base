'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, CheckCircle2, Circle, ChevronDown, ChevronRight, Trash2, Edit3 } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import type { KnowledgeItem, KnowledgeKind } from '@/lib/db/types';

interface KnowledgeLibraryProps {
  brandId: string;
}

const KIND_CONFIG: Record<KnowledgeKind, { label: string; badgeClass: string }> = {
  recomendacion: { label: 'Recomendación', badgeClass: 'bg-blue-50 text-blue-600 border-blue-200' },
  faq: { label: 'FAQ', badgeClass: 'bg-violet-50 text-violet-600 border-violet-200' },
  politica: { label: 'Política', badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  normativa: { label: 'Normativa', badgeClass: 'bg-amber-50 text-amber-600 border-amber-200' },
};

const ALL_KINDS: KnowledgeKind[] = ['recomendacion', 'faq', 'politica', 'normativa'];

export function KnowledgeLibrary({ brandId }: KnowledgeLibraryProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [filterKind, setFilterKind] = useState<KnowledgeKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', kind: 'recomendacion' as KnowledgeKind, body_md: '', audience: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await db.getKnowledgeItems(brandId);
      setItems(data);
    } catch (error) {
      console.error('Failed to load knowledge items:', error);
    }
  }, [brandId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter(item => {
    if (filterKind !== 'all' && item.kind !== filterKind) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.body_md.toLowerCase().includes(q) || item.audience.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAdd = async () => {
    if (!newItem.title.trim()) return;
    await db.createKnowledgeItem({
      brand_id: brandId,
      kind: newItem.kind,
      title: newItem.title.trim(),
      body_md: newItem.body_md.trim(),
      audience: newItem.audience.trim(),
    });
    setNewItem({ title: '', kind: 'recomendacion', body_md: '', audience: '' });
    setShowAddForm(false);
    await load();
  };

  const handleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    const item = items.find(i => i.id === id);
    setExpandedId(id);
    setEditBody(item?.body_md || '');
  };

  const handleSaveBody = async (id: string) => {
    await db.updateKnowledgeItem(id, { body_md: editBody });
    await load();
  };

  const handleToggleVerified = async (id: string, current: boolean) => {
    await db.updateKnowledgeItem(id, { verified: !current });
    await load();
  };

  const handleDelete = async (id: string) => {
    await db.deleteKnowledgeItem(id);
    setDeleteConfirm(null);
    if (expandedId === id) setExpandedId(null);
    await load();
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Biblioteca de Conocimiento Operativo</h3>
          <p className="mt-0.5 text-xs text-slate-400">{items.length} ítem{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo ítem
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="w-40 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={filterKind}
            onChange={e => setFilterKind(e.target.value as KnowledgeKind | 'all')}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none"
          >
            <option value="all">Todos los tipos</option>
            {ALL_KINDS.map(kind => (
              <option key={kind} value={kind}>{KIND_CONFIG[kind].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border-b border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Título</label>
              <input
                type="text"
                value={newItem.title}
                onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Título del ítem"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
              <select
                value={newItem.kind}
                onChange={e => setNewItem({ ...newItem, kind: e.target.value as KnowledgeKind })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-violet-300"
              >
                {ALL_KINDS.map(kind => (
                  <option key={kind} value={kind}>{KIND_CONFIG[kind].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Audiencia</label>
              <input
                type="text"
                value={newItem.audience}
                onChange={e => setNewItem({ ...newItem, audience: e.target.value })}
                placeholder="Ej: familias con niños"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Contenido (Markdown)</label>
            <textarea
              value={newItem.body_md}
              onChange={e => setNewItem({ ...newItem, body_md: e.target.value })}
              placeholder="Contenido del ítem…"
              rows={3}
              className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newItem.title.trim()}
              className="rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Añadir
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewItem({ title: '', kind: 'recomendacion', body_md: '', audience: '' }); }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Search className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">
            {items.length === 0 ? 'Aún no hay ítems de conocimiento' : 'Sin resultados para este filtro'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map(item => {
            const kindConf = KIND_CONFIG[item.kind];
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="transition-colors hover:bg-slate-50/30">
                {/* Row */}
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <button onClick={() => handleExpand(item.id)} className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <span className="flex-1 text-sm font-medium text-slate-700">{item.title}</span>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${kindConf.badgeClass}`}>
                    {kindConf.label}
                  </span>
                  {item.audience && (
                    <span className="text-xs text-slate-400">{item.audience}</span>
                  )}
                  <button
                    onClick={() => handleToggleVerified(item.id, item.verified)}
                    className={`rounded p-1 transition-colors ${item.verified ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
                    title={item.verified ? 'Verificado' : 'No verificado'}
                  >
                    {item.verified ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </button>
                  {deleteConfirm === item.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(item.id)} className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600">Eliminar</button>
                      <button onClick={() => setDeleteConfirm(null)} className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100">Cancelar</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(item.id)}
                      className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Expanded edit area */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Editar contenido</span>
                    </div>
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700 outline-none focus:border-violet-300"
                      rows={5}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => handleSaveBody(item.id)}
                        className="rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                      >
                        Guardar cambios
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
