'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trophy, XCircle, Star, AlertCircle, Trash2, ChevronDown, ChevronUp, Loader2, Sparkles, Info } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import type { NamingCandidate, NamingStatus } from '@/lib/db/types';
import { splitNamingRationale, compileNamingRationale, splitBlock3Content, compileBlock3Content, NamingAnalysis } from '@/lib/utils/naming-content';

interface NamingLabProps {
  brandId: string;
  onUpdate?: () => void;
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

export function NamingLab({ brandId, onUpdate }: NamingLabProps) {
  const [candidates, setCandidates] = useState<NamingCandidate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [vetoModal, setVetoModal] = useState<{ id: string } | null>(null);
  const [vetoReason, setVetoReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // AI Integration states
  const [apiKey, setApiKey] = useState('');
  const [localKeyInput, setLocalKeyInput] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

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

  // Load API Key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('sb_gemini_api_key') || '';
      setApiKey(savedKey);
      setLocalKeyInput(savedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_gemini_api_key', trimmed);
    }
  };

  const syncBlock3 = async (updatedList: NamingCandidate[]) => {
    try {
      const blocks = await db.getBrandBlocks(brandId);
      const block3 = blocks.find(b => b.block_id === 3);
      const currentContent = block3?.content_md || '';
      
      const rawMarkdown = splitBlock3Content(currentContent);
      const updatedContent = compileBlock3Content(rawMarkdown, updatedList);
      
      await db.updateBrandBlock(brandId, 3, {
        content_md: updatedContent,
        status: block3?.status || 'borrador'
      });
      onUpdate?.();
    } catch (err) {
      console.error('Failed to sync naming candidates to Block 3:', err);
    }
  };

  const runAiAnalysis = async (candidate: NamingCandidate) => {
    if (!apiKey) {
      setApiError('API Key no encontrada.');
      return;
    }
    setAnalyzingId(candidate.id);
    setApiError(null);

    try {
      let historyText = '';
      let valPropText = '';

      try {
        const blocks = await db.getBrandBlocks(brandId);
        const b1 = blocks.find(b => b.block_id === 1);
        if (b1?.content_md) historyText = b1.content_md;
        const b2 = blocks.find(b => b.block_id === 2);
        if (b2?.content_md) valPropText = b2.content_md;
      } catch (err) {
        console.error('Error fetching brand context blocks for naming AI:', err);
      }

      const brand = await db.getBrand(brandId);
      const brandName = brand?.name || 'iARTESANA';
      const candidateName = candidate.name;
      const { userRationale } = splitNamingRationale(candidate.rationale_md);

      const promptText = `Eres un experto internacional en naming de marcas e identidad corporativa.
Tu tarea es auditar y evaluar el siguiente nombre candidato para una marca.

Información de la Marca:
- Nombre: ${brandName}
${historyText ? `- Historia y Sector: ${historyText.substring(0, 1000)}` : ''}
${valPropText ? `- Misión, Visión y Valores: ${valPropText.substring(0, 1000)}` : ''}

Nombre candidato a analizar: "${candidateName}"
${userRationale ? `- Notas/Razonamiento inicial del equipo: ${userRationale}` : ''}

Evalúa este nombre candidato basándote en los siguientes 7 parámetros clásico de rendimiento de naming:
1. Sonoridad y Ritmo: Armonía fonética, ritmo natural y musicalidad al pronunciarlo.
2. Memorabilidad: Facilidad para recordar el nombre y quedar grabado en la mente del consumidor.
3. Distintividad: Nivel de diferenciación frente a competidores y marcas en el sector.
4. Semántica y Significado: Asociaciones conceptuales, riqueza evocadora y metáforas implícitas.
5. Legibilidad y Escritura: Facilidad para leerlo y escribirlo correctamente sin confusiones ortográficas.
6. Viabilidad Internacional: Pronunciabilidad en otros idiomas principales (especialmente inglés) y ausencia de connotaciones negativas en otras culturas.
7. Alineación de Marca: Coherencia con el propósito, historia, valores y esencia de la marca.

Requisitos de la respuesta:
Devuelve una evaluación técnica honesta y profunda.
Debes responder ÚNICAMENTE con un objeto JSON válido que cumpla estrictamente con esta estructura de TypeScript (sin bloques markdown de código de ningún tipo):
{
  "overallScore": number (valoración global de 1 a 100 basada en la media ponderada de los parámetros),
  "pros": string[] (lista de 2 o 3 fortalezas claras de este nombre),
  "contras": string[] (lista de 1 o 2 desventajas, riesgos o desafíos de este nombre),
  "claims": string[] (lista de 2 o 3 posibles taglines o claims publicitarios cortos y pegadizos que funcionen con este nombre),
  "parameters": [
    { "name": "Sonoridad y Ritmo", "score": number (de 1 a 10), "text": "explicación de hasta 120 caracteres" },
    { "name": "Memorabilidad", "score": number (de 1 a 10), "text": "explicación de hasta 120 caracteres" },
    { "name": "Distintividad", "score": number (de 1 a 10), "text": "explicación de hasta 120 caracteres" },
    { "name": "Semántica y Significado", "score": number (de 1 a 10), "text": "explicación de hasta 120 caracteres" },
    { "name": "Legibilidad y Escritura", "score": number (de 1 a 10), "text": "explicación de hasta 120 caracteres" },
    { "name": "Viabilidad Internacional", "score": number (de 1 a 10), "text": "explicación de hasta 120 caracteres" },
    { "name": "Alineación de Marca", "score": number (de 1 a 10), "text": "explicación de hasta 120 caracteres" }
  ]
}

No incluyas explicaciones previas ni posteriores, ni bloques de formato markdown, solo el objeto JSON crudo.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }]
            }
          ]
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Error del servidor (Código ${response.status})`);
      }

      let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      resultText = resultText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      
      const parsedAnalysis = JSON.parse(resultText) as NamingAnalysis;

      const compiledRationale = compileNamingRationale(userRationale, parsedAnalysis);
      await db.updateNamingCandidate(candidate.id, { rationale_md: compiledRationale });
      
      const latestCandidates = await db.getNamingCandidates(brandId);
      setCandidates(latestCandidates);
      await syncBlock3(latestCandidates);
    } catch (err: any) {
      console.error('Error running naming AI analysis:', err);
      setApiError(err.message || 'Error de conexión con Gemini. Revisa la consola.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await db.createNamingCandidate({
        brand_id: brandId,
        name: newName.trim(),
        rationale_md: newRationale.trim(),
      });
      setNewName('');
      setNewRationale('');
      setShowAddForm(false);
      
      const latestCandidates = await db.getNamingCandidates(brandId);
      setCandidates(latestCandidates);
      await syncBlock3(latestCandidates);
    } catch (err) {
      console.error('Failed to add candidate:', err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: NamingStatus) => {
    if (newStatus === 'descartado') {
      setVetoModal({ id });
      setVetoReason('');
      return;
    }
    
    try {
      if (newStatus === 'elegido') {
        const currentElegido = candidates.find(c => c.status === 'elegido');
        if (currentElegido && currentElegido.id !== id) {
          await db.updateNamingCandidate(currentElegido.id, { status: 'candidato' });
        }
      }
      
      const updatePayload: any = { status: newStatus, veto_reason: null };
      
      await db.updateNamingCandidate(id, updatePayload);
      
      const latestCandidates = await db.getNamingCandidates(brandId);
      setCandidates(latestCandidates);
      await syncBlock3(latestCandidates);
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleVetoConfirm = async () => {
    if (!vetoModal || !vetoReason.trim()) return;
    try {
      await db.updateNamingCandidate(vetoModal.id, { status: 'descartado', veto_reason: vetoReason.trim() });
      setVetoModal(null);
      setVetoReason('');
      
      const latestCandidates = await db.getNamingCandidates(brandId);
      setCandidates(latestCandidates);
      await syncBlock3(latestCandidates);
    } catch (err) {
      console.error('Failed to veto candidate:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.deleteNamingCandidate(id);
      setDeleteConfirm(null);
      
      const latestCandidates = await db.getNamingCandidates(brandId);
      setCandidates(latestCandidates);
      await syncBlock3(latestCandidates);
    } catch (err) {
      console.error('Failed to delete candidate:', err);
    }
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
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 cursor-pointer"
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
              <label className="mb-1 block text-xs font-medium text-slate-650">Nombre</label>
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
              <label className="mb-1 block text-xs font-medium text-slate-655">Razonamiento inicial</label>
              <input
                type="text"
                value={newRationale}
                onChange={e => setNewRationale(e.target.value)}
                placeholder="Notas de significado, sonoridad, etc."
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-350 focus:ring-1 focus:ring-violet-200"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="rounded-md bg-violet-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50 cursor-pointer"
            >
              Añadir candidato
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); setNewRationale(''); }}
              className="rounded-md border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
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
              <tr className="border-b border-slate-100 bg-slate-50 select-none">
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Nombre (Haz clic para ver análisis)</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Razonamiento inicial</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado</th>
                <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Razón de veto</th>
                <th className="w-10 px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => {
                const config = statusConfig[candidate.status];
                const { userRationale, analysis } = splitNamingRationale(candidate.rationale_md);
                const isExpanded = expandedId === candidate.id;

                return (
                  <React.Fragment key={candidate.id}>
                    <tr 
                      className={`border-b border-slate-100 ${config.rowClass} cursor-pointer transition-colors hover:bg-slate-50/50`}
                      onClick={() => setExpandedId(isExpanded ? null : candidate.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-slate-400 shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <span className={`text-sm font-semibold flex items-center gap-1.5 ${candidate.status === 'elegido' ? 'text-emerald-700' : candidate.status === 'descartado' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {candidate.name}
                            {analysis && (
                              <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-600 border border-blue-150 select-none shadow-sm">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5 text-blue-500 fill-blue-500" />
                                {analysis.overallScore}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500 truncate max-w-[280px] block" title={userRationale}>
                          {userRationale || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium select-none ${config.badgeClass}`}>
                            {config.icon}
                            {config.label}
                          </span>
                          {/* Status change buttons */}
                          <div className="ml-1 flex gap-0.5">
                            {candidate.status !== 'elegido' && (
                              <button
                                onClick={() => handleStatusChange(candidate.id, 'elegido')}
                                className="rounded p-1 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-500 cursor-pointer"
                                title="Elegir"
                              >
                                <Trophy className="h-3 w-3" />
                              </button>
                            )}
                            {candidate.status !== 'candidato' && (
                              <button
                                onClick={() => handleStatusChange(candidate.id, 'candidato')}
                                className="rounded p-1 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-500 cursor-pointer"
                                title="Volver a candidato"
                              >
                                <Star className="h-3 w-3" />
                              </button>
                            )}
                            {candidate.status !== 'descartado' && (
                              <button
                                onClick={() => handleStatusChange(candidate.id, 'descartado')}
                                className="rounded p-1 text-slate-405 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
                                title="Descartar"
                              >
                                <XCircle className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-red-500 italic max-w-[150px] truncate block" title={candidate.veto_reason || undefined}>
                          {candidate.veto_reason || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {deleteConfirm === candidate.id ? (
                          <div className="flex items-center gap-1 select-none">
                            <button onClick={() => handleDelete(candidate.id)} className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600 cursor-pointer">Sí</button>
                            <button onClick={() => setDeleteConfirm(null)} className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(candidate.id)}
                            className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expandable row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={5} className="px-6 py-4 border-b border-slate-100">
                          {/* Expanded content */}
                          <div className="space-y-4 text-left">
                            {/* User manual notes */}
                            {userRationale && (
                              <div className="mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 select-none">Notas del equipo</span>
                                <p className="text-xs text-slate-650 leading-relaxed bg-white border border-slate-150 p-3 rounded-lg shadow-sm">
                                  {userRationale}
                                </p>
                              </div>
                            )}

                            {/* AI analysis result */}
                            {analysis ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-150 pb-2.5">
                                  <div className="flex items-center gap-1.5 select-none">
                                    <Sparkles className="h-4.5 w-4.5 text-blue-500 animate-pulse" />
                                    <h4 className="text-xs font-bold text-slate-705">Informe de Naming con Inteligencia Artificial</h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-white border border-slate-150 px-2.5 py-0.8 rounded-lg text-xs font-semibold shadow-sm select-none">
                                    <span className="text-slate-400 text-[9px] uppercase tracking-wider">Puntuación:</span>
                                    <span className={`font-black text-xs ${
                                      analysis.overallScore >= 80 
                                        ? 'text-emerald-600' 
                                        : analysis.overallScore >= 50 
                                          ? 'text-amber-600' 
                                          : 'text-red-600'
                                    }`}>{analysis.overallScore}/100</span>
                                  </div>
                                </div>

                                {/* 7 parameters grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {analysis.parameters.map((p, idx) => {
                                    const isHigh = p.score >= 8;
                                    const isMid = p.score >= 5 && p.score < 8;
                                    const barColor = isHigh ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-red-500';
                                    const textColor = isHigh ? 'text-emerald-600' : isMid ? 'text-amber-600' : 'text-red-600';

                                    return (
                                      <div key={idx} className="bg-white border border-slate-150 rounded-xl p-3 flex flex-col justify-between shadow-sm hover:border-slate-200 transition-colors">
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between select-none">
                                            <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wide">{p.name}</span>
                                            <span className={`text-xs font-black font-mono ${textColor}`}>{p.score}/10</span>
                                          </div>
                                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full ${barColor}`} style={{ width: `${p.score * 10}%` }} />
                                          </div>
                                          <p className="text-[10px] text-slate-500 leading-normal pt-1 font-sans">{p.text}</p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Pros & Cons */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-emerald-50/30 border border-emerald-100 rounded-xl p-3.5">
                                    <span className="text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider block mb-2 select-none">Puntos Fuertes (Pros)</span>
                                    <ul className="list-disc pl-4 space-y-1.5">
                                      {analysis.pros.map((pro, idx) => (
                                        <li key={idx} className="text-xs text-slate-650 font-sans leading-relaxed">{pro}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="bg-red-50/20 border border-red-100 rounded-xl p-3.5">
                                    <span className="text-[9.5px] font-bold text-red-700 uppercase tracking-wider block mb-2 select-none">Riesgos / Desafíos (Contras)</span>
                                    <ul className="list-disc pl-4 space-y-1.5">
                                      {analysis.contras.map((contra, idx) => (
                                        <li key={idx} className="text-xs text-slate-650 font-sans leading-relaxed">{contra}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                {/* claims & taglines */}
                                <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-3.5">
                                  <span className="text-[9.5px] font-bold text-blue-700 uppercase tracking-wider block mb-2 select-none">Sugerencia de Taglines / Claims</span>
                                  <div className="flex flex-wrap gap-2.5">
                                    {analysis.claims.map((claim, idx) => (
                                      <span key={idx} className="inline-flex items-center rounded-lg bg-blue-50/60 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-100 shadow-sm font-sans italic">
                                        "{claim}"
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Footer buttons */}
                                <div className="flex justify-between items-center pt-2" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); runAiAnalysis(candidate); }}
                                    disabled={analyzingId === candidate.id}
                                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 text-xs px-3.5 py-2 rounded-lg transition-colors font-semibold cursor-pointer select-none"
                                  >
                                    {analyzingId === candidate.id ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Analizando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                                        <span>Volver a analizar con IA</span>
                                      </>
                                    )}
                                  </button>
                                  {apiError && analyzingId === candidate.id && (
                                    <span className="text-xs text-red-500 font-semibold">{apiError}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center">
                                <Sparkles className="h-8 w-8 text-slate-350 mb-2" />
                                <span className="text-xs font-bold text-slate-705 select-none">Auditoría de Naming no disponible</span>
                                <p className="text-[11px] text-slate-400 mt-1 max-w-sm font-sans">Genera un análisis completo de pros, contras, claims publicitarios y evaluación de legibilidad con Inteligencia Artificial.</p>

                                {/* API Key input inside expandable row */}
                                {!apiKey ? (
                                  <div className="mt-4 w-full max-w-md bg-white border border-slate-200 rounded-xl p-4 text-left shadow-sm" onClick={e => e.stopPropagation()}>
                                    <div className="flex gap-1.5 items-start text-amber-600 mb-2 select-none">
                                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Requiere Gemini API Key</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-3 leading-normal font-sans">Introduce tu API Key de Google AI Studio. Se almacena de forma segura en tu navegador y se comparte automáticamente con el Laboratorio Visual.</p>
                                    <div className="flex gap-2">
                                      <input
                                        type="password"
                                        placeholder="AIzaSy..."
                                        value={localKeyInput}
                                        onChange={(e) => setLocalKeyInput(e.target.value)}
                                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-500"
                                      />
                                      <button
                                        onClick={() => handleSaveApiKey(localKeyInput)}
                                        className="rounded-lg bg-violet-600 hover:bg-violet-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer select-none font-sans"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); runAiAnalysis(candidate); }}
                                    disabled={analyzingId === candidate.id}
                                    className="mt-4 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer select-none font-sans"
                                  >
                                    {analyzingId === candidate.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin font-sans" />
                                        <span>Analizando candidato...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4 font-sans" />
                                        <span>Analizar candidato con IA</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {apiError && analyzingId === candidate.id && (
                                  <p className="text-xs text-red-500 mt-3 font-semibold font-sans">{apiError}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
            <div className="mb-3 flex items-center gap-2 select-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h4 className="text-sm font-semibold text-slate-800 font-sans">Razón de descarte</h4>
            </div>
            <p className="mb-3 text-xs text-slate-500 font-sans">
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
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-650 transition-colors hover:bg-slate-50 cursor-pointer font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={handleVetoConfirm}
                disabled={!vetoReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 cursor-pointer font-sans"
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
