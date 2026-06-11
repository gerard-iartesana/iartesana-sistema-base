'use client';

import React from 'react';
import { STAGES, getBlocksByStage } from '@/lib/data/block-definitions';
import type { Stage, BrandBlock } from '@/lib/db/types';
import { CheckCircle2, Clock } from 'lucide-react';

interface BlockNavProps {
  selectedStage: Stage;
  selectedBlockId: number | null;
  onSelectStage: (stage: Stage) => void;
  onSelectBlock: (blockId: number) => void;
  brandBlocks: BrandBlock[];
}

const statusConfig: Record<string, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  'vacio': { label: 'Vacío', dotColor: 'bg-slate-300', bgColor: 'bg-slate-50', textColor: 'text-slate-500' },
  'borrador': { label: 'Borrador', dotColor: 'bg-blue-400', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  'en_revision': { label: 'En revisión', dotColor: 'bg-amber-400', bgColor: 'bg-amber-50', textColor: 'text-amber-600' },
  'validado': { label: 'Validado', dotColor: 'bg-emerald-400', bgColor: 'bg-emerald-50', textColor: 'text-emerald-600' },
};

export function BlockNav({ selectedStage, selectedBlockId, onSelectStage, onSelectBlock, brandBlocks }: BlockNavProps) {
  const stageBlocks = getBlocksByStage(selectedStage);

  return (
    <div className="flex flex-col">
      {/* Stage tabs */}
      <div className="flex border-b border-slate-200">
        {STAGES.map(stage => {
          const isActive = stage.key === selectedStage;

          // Calculate stage blocks status
          const stageBlockDefs = getBlocksByStage(stage.key);
          const stageBlocksData = stageBlockDefs.map(def => brandBlocks.find(b => b.block_id === def.id));
          const totalStageBlocks = stageBlockDefs.length;
          const validatedStageBlocks = stageBlocksData.filter(b => b?.status === 'validado').length;
          const inRevisionStageBlocks = stageBlocksData.filter(b => b?.status === 'en_revision').length;
          const draftStageBlocks = stageBlocksData.filter(b => b?.status === 'borrador').length;

          let stageStatusMarker = null;
          if (validatedStageBlocks === totalStageBlocks && totalStageBlocks > 0) {
            stageStatusMarker = (
              <span className="ml-1 inline-flex items-center justify-center rounded-full text-emerald-500" title="Todos los bloques validados">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
            );
          } else if (inRevisionStageBlocks > 0) {
            stageStatusMarker = (
              <span className="ml-1 inline-flex items-center justify-center rounded-full text-amber-500" title="Bloques pendientes de revisión">
                <Clock className="h-3.5 w-3.5 animate-pulse" />
              </span>
            );
          } else if (draftStageBlocks > 0) {
            stageStatusMarker = (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-400" title="En desarrollo" />
            );
          }

          return (
            <button
              key={stage.key}
              onClick={() => onSelectStage(stage.key)}
              className={`relative flex-1 px-2 py-3 text-center text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                isActive
                  ? 'text-slate-800'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: stage.color }}
              >
                {stage.key}
              </span>
              <span className="hidden sm:inline truncate">{stage.label}</span>
              {stageStatusMarker}
              {isActive && (
                <div
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Block list */}
      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border-b border-slate-200">
        {stageBlocks.map(block => {
          const brandBlock = brandBlocks.find(b => b.block_id === block.id);
          const status = brandBlock?.status || 'vacio';
          const config = statusConfig[status] || statusConfig['vacio'];
          const isSelected = selectedBlockId === block.id;
          const stageInfo = STAGES.find(s => s.key === selectedStage);

          return (
            <button
              key={block.id}
              onClick={() => onSelectBlock(block.id)}
              className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-all ${
                isSelected
                  ? 'bg-white shadow-sm border-slate-300 font-semibold text-slate-800'
                  : 'border-slate-200 bg-white/50 text-slate-600 hover:bg-white hover:text-slate-800'
              }`}
              style={isSelected ? { borderLeft: `3px solid ${stageInfo?.color || '#8B5CF6'}` } : undefined}
            >
              {/* Block number */}
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                isSelected ? 'text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`} style={isSelected ? { backgroundColor: stageInfo?.color || '#8B5CF6' } : undefined}>
                {block.id}
              </span>

              {/* Title */}
              <span className="text-xs truncate max-w-[150px] sm:max-w-[200px]">
                {block.title}
              </span>

              {/* Status dot */}
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dotColor}`} title={config.label} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
