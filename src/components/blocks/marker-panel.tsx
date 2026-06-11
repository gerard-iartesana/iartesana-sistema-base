'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Plus, ChevronDown, ChevronRight, X, Tag } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import type { Marker, MarkerType } from '@/lib/db/types';

interface MarkerPanelProps {
  brandId: string;
  blockId: number;
  onInsertMarker?: (template: string) => void;
}

export function MarkerPanel({ brandId, blockId, onInsertMarker }: MarkerPanelProps) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newType, setNewType] = useState<MarkerType>('pendiente');
  const [newText, setNewText] = useState('');

  const loadMarkers = useCallback(async () => {
    try {
      const allMarkers = await db.getMarkers(brandId);
      // Filter by blockId client-side
      setMarkers(allMarkers.filter(m => m.block_id === blockId));
    } catch (error) {
      console.error('Failed to load markers:', error);
    }
  }, [brandId, blockId]);

  useEffect(() => {
    loadMarkers();
  }, [loadMarkers]);

  const unresolvedMarkers = markers.filter(m => !m.resolved);
  const resolvedMarkers = markers.filter(m => m.resolved);
  const pendienteMarkers = unresolvedMarkers.filter(m => m.type === 'pendiente');
  const verificarMarkers = unresolvedMarkers.filter(m => m.type === 'verificar');

  const handleResolve = async (id: string) => {
    await db.resolveMarker(id);
    await loadMarkers();
  };

  const handleDelete = async (id: string) => {
    await db.deleteMarker(id);
    await loadMarkers();
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    await db.createMarker({
      brand_id: brandId,
      block_id: blockId,
      type: newType,
      text: newText.trim(),
    });
    setNewText('');
    setShowAddForm(false);
    await loadMarkers();
  };

  const handleInsertTemplate = (type: MarkerType) => {
    onInsertMarker?.(`[${type}: ]`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Marcadores</h3>
          {unresolvedMarkers.length > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-bold text-slate-600">
              {unresolvedMarkers.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="Añadir marcador"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Insert template buttons */}
      <div className="flex gap-1.5 border-b border-slate-100 px-3 py-2">
        <button
          onClick={() => handleInsertTemplate('pendiente')}
          className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-600 transition-colors hover:bg-amber-100"
        >
          <Clock className="h-3 w-3" />
          Insertar [pendiente]
        </button>
        <button
          onClick={() => handleInsertTemplate('verificar')}
          className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-100"
        >
          <AlertTriangle className="h-3 w-3" />
          Insertar [verificar]
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="border-b border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as MarkerType)}
              className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-violet-300"
            >
              <option value="pendiente">Pendiente</option>
              <option value="verificar">Verificar</option>
            </select>
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAddForm(false); setNewText(''); } }}
              placeholder="Texto del marcador…"
              className="flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newText.trim()}
              className="rounded bg-violet-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
            >
              Añadir
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewText(''); }}
              className="rounded border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Markers list */}
      <div className="flex-1 overflow-y-auto">
        {unresolvedMarkers.length === 0 && !showAddForm && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="mb-2 h-6 w-6 text-slate-200" />
            <p className="text-xs text-slate-400">Sin marcadores abiertos</p>
          </div>
        )}

        {/* Pendiente markers */}
        {pendienteMarkers.length > 0 && (
          <div className="px-3 py-2">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500">
              <Clock className="h-3 w-3" />
              Pendiente ({pendienteMarkers.length})
            </h4>
            <div className="space-y-1">
              {pendienteMarkers.map(marker => (
                <div key={marker.id} className="group flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/50 px-2.5 py-2">
                  <span className="flex-1 text-xs text-amber-700">{marker.text}</span>
                  <button
                    onClick={() => handleResolve(marker.id)}
                    className="shrink-0 rounded p-0.5 text-amber-400 opacity-0 transition-all hover:bg-amber-100 hover:text-amber-600 group-hover:opacity-100"
                    title="Resolver"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verificar markers */}
        {verificarMarkers.length > 0 && (
          <div className="px-3 py-2">
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-500">
              <AlertTriangle className="h-3 w-3" />
              Verificar ({verificarMarkers.length})
            </h4>
            <div className="space-y-1">
              {verificarMarkers.map(marker => (
                <div key={marker.id} className="group flex items-start gap-2 rounded-md border border-red-100 bg-red-50/50 px-2.5 py-2">
                  <span className="flex-1 text-xs text-red-700">{marker.text}</span>
                  <button
                    onClick={() => handleResolve(marker.id)}
                    className="shrink-0 rounded p-0.5 text-red-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                    title="Resolver"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved markers (collapsed) */}
        {resolvedMarkers.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600"
            >
              {showResolved ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Resueltos ({resolvedMarkers.length})
            </button>
            {showResolved && (
              <div className="mt-1.5 space-y-1">
                {resolvedMarkers.map(marker => (
                  <div key={marker.id} className="group flex items-start gap-2 rounded-md bg-slate-50 px-2.5 py-1.5">
                    <span className="flex-1 text-xs text-slate-400 line-through">{marker.text}</span>
                    <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleDelete(marker.id)}
                        className="rounded p-0.5 text-slate-400 transition-colors hover:bg-red-100 hover:text-red-500"
                        title="Eliminar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
