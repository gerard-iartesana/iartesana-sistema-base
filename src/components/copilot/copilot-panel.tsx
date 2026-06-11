'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PanelRightOpen, PanelRightClose, Bot, BookOpen, Languages, Target, Shield,
  Play, Copy, Download, ChevronDown, ChevronRight, Clock, AlertCircle, Check
} from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import { useBrand } from '@/lib/contexts/brand-context';
import type { AgentName, AgentRun } from '@/lib/db/types';

export interface AgentConfig {
  key: AgentName;
  label: string;
  icon: React.ReactNode;
  description: string;
  hasInput: boolean;
  inputPlaceholder: string;
  color: string;
}

export const AGENTS: AgentConfig[] = [
  {
    key: 'historiador',
    label: 'Historiador',
    icon: <BookOpen className="h-4 w-4" />,
    description: 'Limpia y estructura transcripciones de entrevistas para el bloque activo. Conserva citas textuales y marca datos dudosos con [verificar: ...].',
    hasInput: true,
    inputPlaceholder: 'Pega aquí la transcripción bruta de la entrevista o audio…',
    color: '#8B5CF6',
  },
  {
    key: 'linguista',
    label: 'Lingüista',
    icon: <Languages className="h-4 w-4" />,
    description: 'Reescribe textos reales de la empresa alineándolos con la identidad verbal definida. Detecta desviaciones del tono y vocabulario.',
    hasInput: true,
    inputPlaceholder: 'Pega aquí el texto real de la empresa (email, web, post)…',
    color: '#3B82F6',
  },
  {
    key: 'estratega',
    label: 'Estratega',
    icon: <Target className="h-4 w-4" />,
    description: 'Genera fichas de perfil de público no-demográfico a partir de notas. Define comportamientos, valores y perfiles excluidos.',
    hasInput: true,
    inputPlaceholder: 'Pega aquí notas sueltas sobre los clientes de la marca…',
    color: '#10B981',
  },
  {
    key: 'auditor',
    label: 'Auditor',
    icon: <Shield className="h-4 w-4" />,
    description: 'Analiza TODOS los bloques de la marca buscando contradicciones, huecos críticos, y propone instrucciones para el Bloque 13.',
    hasInput: false,
    inputPlaceholder: '',
    color: '#F59E0B',
  },
];

export interface CopilotPanelProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedAgent: AgentName | null;
  setSelectedAgent: (agent: AgentName | null) => void;
}

export function CopilotPanel({ isOpen, setIsOpen, selectedAgent, setSelectedAgent }: CopilotPanelProps) {
  const { activeBrand } = useBrand();
  const [inputText, setInputText] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [history, setHistory] = useState<AgentRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!activeBrand) {
      setHistory([]);
      return;
    }
    try {
      const data = await db.getAgentRuns(activeBrand.id);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load agent history:', error);
    }
  }, [activeBrand]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setSelectedAgent(null);
    setInputText('');
    setResult(null);
  }, [activeBrand, setSelectedAgent]);

  const agent = selectedAgent ? AGENTS.find(a => a.key === selectedAgent) : null;

  const handleRun = () => {
    if (!activeBrand || !selectedAgent) return;
    setIsRunning(true);
    setResult(null);

    // Simulate a brief delay then show the not-connected message
    setTimeout(async () => {
      const message = 'Agente IA no conectado. Configura las Edge Functions de Supabase para activar el copiloto.';
      setResult(message);
      setIsRunning(false);

      // Save to history
      await db.createAgentRun({
        brand_id: activeBrand.id,
        agent: selectedAgent,
        input_text: inputText,
        output_md: message,
      });
      await loadHistory();
    }, 1000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleSelectAgent = (agentKey: AgentName) => {
    setSelectedAgent(agentKey);
    setInputText('');
    setResult(null);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-lg border border-r-0 border-slate-200 bg-white px-2 py-4 shadow-md transition-colors hover:bg-slate-50"
        title="Abrir Copiloto IA"
      >
        <PanelRightOpen className="h-4 w-4 text-slate-500" />
        <span className="mt-2 block text-[10px] font-medium text-slate-400 [writing-mode:vertical-lr]">Copiloto</span>
      </button>
    );
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-violet-500" />
          <h2 className="text-sm font-semibold text-slate-800">Copiloto IA</h2>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {!activeBrand ? (
        <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
          <Bot className="mb-2 h-8 w-8 text-slate-200" />
          <p className="text-xs text-slate-400">Selecciona una marca para usar el copiloto</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Agent buttons */}
          <div className="grid grid-cols-2 gap-1.5 border-b border-slate-100 p-3">
            {AGENTS.map(a => (
              <button
                key={a.key}
                onClick={() => handleSelectAgent(a.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                  selectedAgent === a.key
                    ? 'border-transparent text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
                style={selectedAgent === a.key ? { backgroundColor: a.color } : undefined}
              >
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>

          {/* Agent form */}
          {agent && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Description */}
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-xs text-slate-500 leading-relaxed">{agent.description}</p>
                </div>

                {/* Input */}
                {agent.hasInput && (
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Entrada
                    </label>
                    <textarea
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder={agent.inputPlaceholder}
                      rows={5}
                      className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200"
                    />
                  </div>
                )}

                {/* Execute button */}
                <button
                  onClick={handleRun}
                  disabled={isRunning || (agent.hasInput && !inputText.trim())}
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: agent.color }}
                >
                  {isRunning ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Ejecutando…
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Ejecutar
                    </>
                  )}
                </button>

                {/* Result */}
                {result && (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Resultado
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p className="text-xs text-slate-600 leading-relaxed">{result}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleCopy(result)}
                        className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {copyFeedback ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copyFeedback ? 'Copiado' : 'Copiar'}
                      </button>
                      <button
                        className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                        onClick={() => handleCopy(result)}
                      >
                        <Download className="h-3 w-3" />
                        Insertar en bloque
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History */}
          <div className="border-t border-slate-200">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:bg-slate-50"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Historial ({history.length})
              </span>
              {showHistory ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {showHistory && history.length > 0 && (
              <div className="max-h-48 overflow-y-auto border-t border-slate-100">
                {history.map(run => {
                  const agentInfo = AGENTS.find(a => a.key === run.agent);
                  const isExpanded = expandedRunId === run.id;
                  return (
                    <div key={run.id} className="border-b border-slate-100">
                      <button
                        onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        {isExpanded ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: agentInfo?.color || '#94A3B8' }} />
                        <span className="flex-1 text-xs font-medium text-slate-600">{agentInfo?.label || run.agent}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(run.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="bg-slate-50 px-3 py-2">
                          {run.input_text && (
                            <div className="mb-2">
                              <span className="text-[10px] font-semibold text-slate-400">Entrada:</span>
                              <p className="mt-0.5 text-xs text-slate-500 line-clamp-3">{run.input_text}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] font-semibold text-slate-400">Resultado:</span>
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-3">{run.output_md}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {showHistory && history.length === 0 && (
              <div className="border-t border-slate-100 p-4 text-center">
                <p className="text-xs text-slate-400">Sin ejecuciones previas</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
