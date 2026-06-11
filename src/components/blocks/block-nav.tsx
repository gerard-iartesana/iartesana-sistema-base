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
      <div className="flex flex-col py-1">
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
              className={`group flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                isSelected
                  ? 'bg-slate-50 border-l-2'
                  : 'border-l-2 border-transparent hover:bg-slate-50/50'
              }`}
              style={isSelected ? { borderLeftColor: stageInfo?.color || '#8B5CF6' } : undefined}
            >
              {/* Block number */}
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
                isSelected ? 'text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
              }`} style={isSelected ? { backgroundColor: stageInfo?.color || '#8B5CF6' } : undefined}>
                {block.id}
              </span>

              {/* Title and status */}
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${isSelected ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                  {block.title}
                </p>
              </div>

              {/* Status badge */}
              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.bgColor} ${config.textColor}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
