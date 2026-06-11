'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { useBrand } from '@/lib/contexts/brand-context';
import { db } from '@/lib/db/local-storage';
import type { BrandBlock, Marker } from '@/lib/db/types';

interface BrandCardProps {
  blocks?: BrandBlock[];
  markers?: Marker[];
}

export function BrandCard({ blocks: propBlocks, markers: propMarkers }: BrandCardProps) {
  const { activeBrand } = useBrand();
  const [localBlocks, setLocalBlocks] = useState<BrandBlock[]>([]);
  const [localMarkers, setLocalMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    // If props are provided, we don't need to load data locally.
    // However, if only one is provided, we still load the other.
    if (propBlocks && propMarkers) return;
    
    if (!activeBrand) {
      setLocalBlocks([]);
      setLocalMarkers([]);
      return;
    }
    let cancelled = false;
    async function loadData() {
      const [fetchedBlocks, fetchedMarkers] = await Promise.all([
        db.getBrandBlocks(activeBrand!.id),
        db.getMarkers(activeBrand!.id),
      ]);
      if (!cancelled) {
        setLocalBlocks(fetchedBlocks);
        setLocalMarkers(fetchedMarkers);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [activeBrand, propBlocks, propMarkers]);

  if (!activeBrand) return null;

  const blocks = propBlocks || localBlocks;
  const markers = propMarkers || localMarkers;

  const totalBlocks = 13;
  const validatedCount = blocks.filter(b => b.status === 'validado').length;
  const percentage = Math.round((validatedCount / totalBlocks) * 100);

  const unresolvedMarkers = markers.filter(m => !m.resolved);
  const pendienteCount = unresolvedMarkers.filter(m => m.type === 'pendiente').length;
  const verificarCount = unresolvedMarkers.filter(m => m.type === 'verificar').length;

  const statusConfig: Record<string, { label: string; className: string }> = {
    activo: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pausado: { label: 'Pausado', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    archivado: { label: 'Archivado', className: 'bg-slate-50 text-slate-500 border-slate-200' },
  };

  const status = statusConfig[activeBrand.status] || statusConfig.activo;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-800">{activeBrand.name}</h3>
          <p className="text-xs text-slate-400">v{activeBrand.doc_version}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Progreso</span>
          <span className="text-xs font-semibold text-slate-700">{validatedCount}/{totalBlocks} ({percentage}%)</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Marker counters */}
      {(pendienteCount > 0 || verificarCount > 0) ? (
        <div className="flex items-center gap-3">
          {pendienteCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-medium text-amber-600">{pendienteCount} pendiente{pendienteCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {verificarCount > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-xs font-medium text-red-600">{verificarCount} verificar</span>
            </div>
          )}
        </div>
      ) : (
        validatedCount === totalBlocks ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">Documento completo</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Sin marcadores abiertos</p>
        )
      )}
    </div>
  );
}
