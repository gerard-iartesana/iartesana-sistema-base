'use client';

import React from 'react';
import { STAGES as ORIGINAL_STAGES, getBlocksByStage } from '@/lib/data/block-definitions';
import type { Stage, BrandBlock } from '@/lib/db/types';
import {
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Users,
  Shield,
  FileOutput,
  FileText,
  Cpu,
  Link2,
  MonitorPlay
} from 'lucide-react';

const stageIcons: Record<string, React.ComponentType<any>> = {
  'A': Sparkles,
  'B': MessageSquare,
  'C': Users,
  'D': Shield,
  'E': FileOutput,
};

const exportBlockIcons: Record<number, React.ComponentType<any>> = {
  101: FileText,
  102: Cpu,
  103: Link2,
  104: MonitorPlay,
};

const EXPORT_BLOCKS = [
  { id: 101, title: 'Documento Markdown', description: 'Exportar o descargar el núcleo de contexto en formato Markdown.' },
  { id: 102, title: 'Prompt Global', description: 'Compilar el Prompt de Sistema completo para agentes de IA.' },
  { id: 103, title: 'Enlace Compartido (Live)', description: 'Crear y gestionar enlaces públicos protegidos con contraseña.' },
  { id: 104, title: 'Presentación', description: 'Modo presentación a pantalla completa.' },
];

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
  const stages = [
    ...ORIGINAL_STAGES,
    { key: 'E' as Stage, label: 'Exportar y Compartir', color: '#36a8e0', bgColor: 'bg-slate-50', borderColor: 'border-slate-300' }
  ];

  return (
    <div className="flex flex-col">
      {stages.map(stage => {
        const isExpanded = stage.key === selectedStage;
        const isExportStage = stage.key === 'E';
        const stageBlocks = isExportStage ? EXPORT_BLOCKS : getBlocksByStage(stage.key);

        // Calculate stage blocks status
        const stageBlocksData = stageBlocks.map(def => brandBlocks.find(b => b.block_id === def.id));
        const totalStageBlocks = stageBlocks.length;
        const validatedStageBlocks = stageBlocksData.filter(b => b?.status === 'validado').length;
        const inRevisionStageBlocks = stageBlocksData.filter(b => b?.status === 'en_revision').length;
        const draftStageBlocks = stageBlocksData.filter(b => b?.status === 'borrador').length;

        let stageStatusMarker = null;
        if (validatedStageBlocks === totalStageBlocks && totalStageBlocks > 0) {
          stageStatusMarker = (
            <span className="shrink-0" title="Todos los bloques validados">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            </span>
          );
        } else if (inRevisionStageBlocks > 0) {
          stageStatusMarker = (
            <span className="shrink-0 animate-pulse" title="Bloques pendientes de revisión">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </span>
          );
        } else if (draftStageBlocks > 0) {
          stageStatusMarker = (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" title="En desarrollo" />
          );
        }

        return (
          <div key={stage.key} className="flex flex-col">
            {/* Stage Accordion Header */}
            <button
              onClick={() => onSelectStage(stage.key)}
              className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                isExpanded ? 'bg-slate-50/80 text-slate-800' : 'text-slate-500 hover:bg-slate-50/50 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {(() => {
                  const Icon = stageIcons[stage.key];
                  return Icon ? (
                    <Icon className="h-4 w-4 shrink-0" style={{ color: stage.color }} />
                  ) : (
                    <span className="font-bold text-xs shrink-0" style={{ color: stage.color }}>{stage.key}</span>
                  );
                })()}
                <span className="truncate">{stage.label}</span>
                {stageStatusMarker}
              </div>
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              )}
            </button>

            {/* Stage blocks (vertical list, indents inside active stage) */}
            {isExpanded && (
              <div className="flex flex-col bg-slate-50/30 border-t border-b border-slate-100/80 py-1">
                {stageBlocks.map(block => {
                  const brandBlock = brandBlocks.find(b => b.block_id === block.id);
                  const status = brandBlock?.status || 'vacio';
                  const config = statusConfig[status] || statusConfig['vacio'];
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <button
                      key={block.id}
                      onClick={() => onSelectBlock(block.id)}
                      className={`flex items-center gap-2.5 py-2 pl-9 pr-4 text-left transition-all ${
                        isSelected
                          ? 'bg-white font-semibold text-slate-800 border-l-2'
                          : 'text-slate-600 hover:bg-white/40 hover:text-slate-800 border-l-2 border-transparent'
                      }`}
                      style={isSelected ? { borderLeftColor: stage.color } : undefined}
                    >
                      {/* Block number or Icon */}
                      {isExportStage ? (
                        (() => {
                          const SubIcon = exportBlockIcons[block.id];
                          return SubIcon ? (
                            <SubIcon
                              className="h-4 w-4 shrink-0"
                              style={isSelected ? { color: stage.color } : { color: '#9ca3af' }}
                            />
                          ) : null;
                        })()
                      ) : (
                        <span
                          className={`w-4 shrink-0 text-center text-xs font-mono font-medium ${
                            isSelected ? 'font-bold' : 'text-slate-400'
                          }`}
                          style={isSelected ? { color: stage.color } : undefined}
                        >
                          {block.id}
                        </span>
                      )}

                      {/* Title */}
                      <span className="text-sm truncate flex-1 leading-snug">
                        {block.title}
                      </span>

                      {/* Status dot */}
                      {!isExportStage && (
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dotColor}`} title={config.label} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
