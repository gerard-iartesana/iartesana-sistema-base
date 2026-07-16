'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown, AlertTriangle, Edit3, Check, X } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import type { Rule, RuleKind } from '@/lib/db/types';

interface RulesEditorProps {
  brandId: string;
  kind: RuleKind;
  readOnly?: boolean;
}

const KIND_CONFIG: Record<RuleKind, { title: string; description: string; color: string; bgColor: string }> = {
  linea_roja: {
    title: 'Líneas rojas específicas',
    description: '',
    color: 'text-red-400',
    bgColor: 'bg-red-950/20',
  },
  protocolo_incidencia: {
    title: 'Ejemplos de incidencias',
    description: '',
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/20',
  },
  instruccion_ia: {
    title: 'Instrucciones específicas',
    description: '',
    color: 'text-violet-400',
    bgColor: 'bg-violet-950/20',
  },
};

export function RulesEditor({ brandId, kind, readOnly = false }: RulesEditorProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newRule, setNewRule] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const config = KIND_CONFIG[kind];

  const load = useCallback(async () => {
    try {
      const data = await db.getRules(brandId, kind);
      setRules(data);
    } catch (error) {
      console.error('Failed to load rules:', error);
    }
  }, [brandId, kind]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (readOnly) return;
    if (!newRule.trim()) return;
    await db.createRule({ brand_id: brandId, kind, body_md: newRule.trim() });
    setNewRule('');
    setShowAddForm(false);
    await load();
  };

  const handleStartEdit = (rule: Rule) => {
    if (readOnly) return;
    setEditingId(rule.id);
    setEditText(rule.body_md);
  };

  const handleSaveEdit = async () => {
    if (readOnly) return;
    if (!editingId || !editText.trim()) return;
    await db.updateRule(editingId, { body_md: editText.trim() });
    setEditingId(null);
    setEditText('');
    await load();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (id: string) => {
    if (readOnly) return;
    await db.deleteRule(id);
    setDeleteConfirm(null);
    if (editingId === id) handleCancelEdit();
    await load();
  };

  const handleMoveUp = async (index: number) => {
    if (readOnly) return;
    if (index <= 0) return;
    const newOrder = [...rules];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    // Update sort values for swapped items
    await Promise.all(
      newOrder.map((rule, i) => db.updateRule(rule.id, { sort: i }))
    );
    await load();
  };

  const handleMoveDown = async (index: number) => {
    if (readOnly) return;
    if (index >= rules.length - 1) return;
    const newOrder = [...rules];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    // Update sort values for swapped items
    await Promise.all(
      newOrder.map((rule, i) => db.updateRule(rule.id, { sort: i }))
    );
    await load();
  };

  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-slate-200 px-4 py-3 ${config.bgColor}`}>
        <div>
          <h3 className={`text-sm font-semibold ${config.color}`}>{config.title}</h3>
          {config.description && <p className="mt-0.5 text-xs text-slate-400">{config.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">{rules.length} regla{rules.length !== 1 ? 's' : ''}</span>
          {!readOnly && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva regla
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border-b border-slate-200 bg-slate-50 p-4 space-y-2">
          <textarea
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            placeholder="Escribe la nueva regla en Markdown…"
            rows={3}
            className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newRule.trim()}
              className="rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Añadir regla
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewRule(''); }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertTriangle className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">Aún no hay reglas definidas</p>
          <p className="mt-1 text-xs text-slate-300">Añade reglas para este bloque</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rules.map((rule, index) => (
            <div key={rule.id} className="group flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-slate-50/50">
              {/* Drag handle / sort number */}
              <div className="flex shrink-0 flex-col items-center gap-0.5 pt-0.5 select-none">
                {!readOnly && <GripVertical className="h-3.5 w-3.5 text-slate-300" />}
                <span className="text-[10px] font-bold text-slate-300">{index + 1}</span>
              </div>

              {/* Move buttons */}
              {!readOnly && (
                <div className="flex shrink-0 flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === rules.length - 1}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Rule content */}
              <div className="min-w-0 flex-1">
                {editingId === rule.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="w-full resize-none rounded-md border border-violet-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-1 ring-violet-200"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1 rounded bg-violet-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-violet-700"
                      >
                        <Check className="h-3 w-3" /> Guardar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                      >
                        <X className="h-3 w-3" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{rule.body_md}</p>
                )}
              </div>

              {/* Actions */}
              {!readOnly && editingId !== rule.id && (
                <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(rule)}
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 cursor-pointer"
                    title="Editar"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  {deleteConfirm === rule.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(rule.id)} className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600 cursor-pointer">Sí</button>
                      <button onClick={() => setDeleteConfirm(null)} className="rounded border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-slate-100 cursor-pointer">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(rule.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
