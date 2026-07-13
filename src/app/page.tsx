'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useBrand } from '@/lib/contexts/brand-context';
import { BrandSelector } from '@/components/sidebar/brand-selector';
import { BlockNav } from '@/components/blocks/block-nav';
import { BlockEditor } from '@/components/blocks/block-editor';
import { NamingLab } from '@/components/blocks/naming-lab';
import { KnowledgeLibrary } from '@/components/blocks/knowledge-library';
import { SegmentationLab } from '@/components/blocks/segmentation-lab';
import { B2BLab } from '@/components/blocks/b2b-lab';
import { RulesEditor } from '@/components/blocks/rules-editor';
import { ArchetypeLab } from '@/components/blocks/archetype-lab';
import { VisualLab } from '@/components/blocks/visual-lab';
import { ValuePropositionLab } from '@/components/blocks/value-proposition-lab';
import { VoiceTensionsLab } from '@/components/blocks/voice-tensions-lab';
import { VerbalIdentityLab } from '@/components/blocks/verbal-identity-lab';
import { CopilotPanel, AGENTS } from '@/components/copilot/copilot-panel';
import { MarkdownExport } from '@/components/export/markdown-export';
import { PromptGlobal } from '@/components/export/prompt-global';
import { LiveLink } from '@/components/export/live-link';
import { Presentation } from '@/components/export/presentation';
import { db } from '@/lib/db/local-storage';
import { BrandBlock, Marker, Stage, AgentName } from '@/lib/db/types';
import { LogOut, Sparkles, Clock, AlertTriangle, Settings } from 'lucide-react';
import { getStageForBlock } from '@/lib/data/block-definitions';

export default function HomePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { activeBrand } = useBrand();
  const [selectedStage, setSelectedStage] = useState<Stage>('A');
  const [selectedBlockId, setSelectedBlockId] = useState<number>(1);
  const [brandBlocks, setBrandBlocks] = useState<BrandBlock[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotAgent, setCopilotAgent] = useState<AgentName | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [globalGeminiKey, setGlobalGeminiKey] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedGeminiKey = localStorage.getItem('gemini_api_key') || '';
      setGlobalGeminiKey(savedGeminiKey);
    }
  }, []);

  const handleSaveGlobalSettings = (geminiKey: string) => {
    setGlobalGeminiKey(geminiKey);
    localStorage.setItem('gemini_api_key', geminiKey);
    // Trigger editor key increment to force labs to remount and read new settings
    setEditorKey(prev => prev + 1);
  };

  const loadData = async () => {
    if (!activeBrand) return;
    try {
      const [blocks, fetchedMarkers] = await Promise.all([
        db.getBrandBlocks(activeBrand.id),
        db.getMarkers(activeBrand.id),
      ]);
      setBrandBlocks(blocks);
      setMarkers(fetchedMarkers);
    } catch (err) {
      console.error('[HomePage] Failed to load brand data:', err);
    }
  };

  // Load brand blocks and markers when active brand changes
  useEffect(() => {
    if (activeBrand) {
      loadData();
    } else {
      setBrandBlocks([]);
      setMarkers([]);
    }
  }, [activeBrand?.id]);

  const handleBlockUpdate = () => {
    loadData();
  };

  const totalBlocks = 13;
  const validatedCount = brandBlocks.filter(b => b.status === 'validado').length;
  const percentage = Math.round((validatedCount / totalBlocks) * 100);
  const unresolvedMarkers = markers.filter(m => !m.resolved);
  const pendienteCount = unresolvedMarkers.filter(m => m.type === 'pendiente').length;
  const verificarCount = unresolvedMarkers.filter(m => m.type === 'verificar').length;

  const handleSelectBlock = (blockId: number) => {
    setSelectedBlockId(blockId);
    const stage = getStageForBlock(blockId);
    if (stage) {
      setSelectedStage(stage);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const ruleKindMap: Record<number, 'linea_roja' | 'protocolo_incidencia' | 'instruccion_ia'> = {
    11: 'linea_roja',
    12: 'protocolo_incidencia',
    13: 'instruccion_ia',
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar Left */}
      <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 h-screen sticky top-0">
        {/* Header */}
        <div className="px-5 py-4 flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <img src="/assets/logo/logo.svg" alt="iARTESANA Logo" className="w-8 h-8 object-contain shrink-0" />
            <div>
              <h1 className="text-lg font-bold text-slate-800">Sistema Base</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Núcleo de Contexto</p>
            </div>
          </div>

          {/* Compact progress bar under brand logo/title */}
          {activeBrand && (
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-400 font-medium select-none">
              {/* Progress percentage and count */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-300 font-semibold">{percentage}%</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{validatedCount}/{totalBlocks}</span>
              </div>

              {/* Thin progress bar */}
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Tiny markers indicators */}
              <div className="flex items-center gap-1.5 shrink-0">
                {pendienteCount > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-500 font-semibold" title="Pendientes">
                    <Clock className="h-3 w-3" />
                    <span>{pendienteCount}</span>
                  </span>
                )}
                {verificarCount > 0 && (
                  <span className="flex items-center gap-0.5 text-red-500 font-semibold" title="A verificar">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{verificarCount}</span>
                  </span>
                )}
                {pendienteCount === 0 && verificarCount === 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Al día" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Block Navigation */}
        {activeBrand && (
          <div className="flex-1 overflow-y-auto flex flex-col justify-between py-2">
            <div>
              <BlockNav
                selectedStage={selectedStage}
                selectedBlockId={selectedBlockId}
                onSelectStage={setSelectedStage}
                onSelectBlock={handleSelectBlock}
                brandBlocks={brandBlocks}
              />
            </div>

            {/* Global Settings Button at the bottom of the sidebar */}
            <div className="border-t border-slate-800/60 mt-auto">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold transition-colors text-white hover:bg-slate-50/50 hover:text-white cursor-pointer select-none"
              >
                <Settings className="h-4 w-4 shrink-0 text-white" />
                <span className="truncate">Configuración Global</span>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-30">
          {/* Left side: AI Copilots */}
          <div className="flex items-center gap-3">
            {activeBrand && (
              <div className="flex gap-1.5">
                  {AGENTS.map(agent => (
                    <button
                      key={agent.key}
                      onClick={() => {
                        setCopilotAgent(agent.key);
                        setIsCopilotOpen(true);
                      }}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        copilotAgent === agent.key && isCopilotOpen
                          ? 'border-transparent text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      style={copilotAgent === agent.key && isCopilotOpen ? { backgroundColor: agent.color } : undefined}
                    >
                      {agent.icon}
                      <span>{agent.label}</span>
                    </button>
                  ))}
                </div>
            )}
          </div>

          {/* Right side: Brand Selector + User Avatar + Logout Button */}
          <div className="flex items-center gap-4 select-none">
            <div className="w-56 shrink-0">
              <BrandSelector blocks={brandBlocks} markers={markers} hideProgress={true} />
            </div>

            {/* User Avatar */}
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.email}
                className="w-8 h-8 rounded-full cursor-help shadow-sm border border-slate-200 object-cover"
                title={`${user.name || user.email} (${user.role})`}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center cursor-help shadow-sm text-white font-semibold text-xs" title={`${user.name || user.email} (${user.role})`}>
                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {activeBrand ? (
          <>
            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col overflow-auto">
                {/* Main Content Pane */}
                <div className="flex-1 p-6">
                  {selectedBlockId === 101 && <MarkdownExport />}
                  {selectedBlockId === 102 && <PromptGlobal />}
                  {selectedBlockId === 103 && <LiveLink />}
                  {selectedBlockId === 104 && <Presentation />}

                  {selectedBlockId < 100 && (
                    <>
                      <BlockEditor
                        key={`editor-${activeBrand.id}-${selectedBlockId}-${editorKey}`}
                        brandId={activeBrand.id}
                        blockId={selectedBlockId}
                        onSave={handleBlockUpdate}
                      />

                      {/* Special UIs for certain blocks */}
                      {selectedBlockId === 2 && (
                        <div className="mt-6">
                          <ValuePropositionLab
                            brandId={activeBrand.id}
                            content_md={brandBlocks.find(b => b.block_id === 2)?.content_md || ''}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 3 && (
                        <div className="mt-6">
                          <NamingLab
                            brandId={activeBrand.id}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 4 && (
                        <div className="mt-6">
                          <ArchetypeLab
                            brandId={activeBrand.id}
                            content_md={brandBlocks.find(b => b.block_id === 4)?.content_md || ''}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 5 && (
                        <div className="mt-6">
                          <VoiceTensionsLab
                            brandId={activeBrand.id}
                            content_md={brandBlocks.find(b => b.block_id === 5)?.content_md || ''}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 6 && (
                        <div className="mt-6">
                          <VerbalIdentityLab
                            brandId={activeBrand.id}
                            content_md={brandBlocks.find(b => b.block_id === 6)?.content_md || ''}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 7 && (
                        <div className="mt-6">
                          <VisualLab
                            brandId={activeBrand.id}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 8 && (
                        <div className="mt-6">
                          <SegmentationLab
                            brandId={activeBrand.id}
                            content_md={brandBlocks.find(b => b.block_id === 8)?.content_md || ''}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 9 && (
                        <div className="mt-6">
                          <B2BLab
                            brandId={activeBrand.id}
                            content_md={brandBlocks.find(b => b.block_id === 9)?.content_md || ''}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {selectedBlockId === 10 && (
                        <div className="mt-6">
                          <KnowledgeLibrary
                            brandId={activeBrand.id}
                            onUpdate={() => {
                              setEditorKey(prev => prev + 1);
                              handleBlockUpdate();
                            }}
                          />
                        </div>
                      )}
                      {[11, 12, 13].includes(selectedBlockId) && (
                        <div className="mt-6">
                          <RulesEditor
                            brandId={activeBrand.id}
                            kind={ruleKindMap[selectedBlockId]}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Copilot Panel */}
              <CopilotPanel
                isOpen={isCopilotOpen}
                setIsOpen={setIsCopilotOpen}
                selectedAgent={copilotAgent}
                setSelectedAgent={setCopilotAgent}
              />
            </div>
          </>
        ) : (
          /* No brand selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-violet-500" size={28} />
              </div>
              <h2 className="text-xl font-semibold text-slate-700 mb-2">Bienvenido al Sistema Base</h2>
              <p className="text-slate-500 text-sm max-w-md">
                Selecciona una marca del panel izquierdo o crea una nueva para comenzar a construir su Núcleo de Contexto.
              </p>
            </div>
          </div>
        )}
      </main>
      {/* Global Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4.5 w-4.5 text-violet-600" />
                <h3 className="text-sm font-bold text-slate-800">Configuración de Inteligencia Artificial</h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-semibold p-1 hover:bg-slate-50 rounded"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 select-none">Clave API de Google Gemini (Copiloto e Imágenes)</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-violet-600 hover:text-violet-500 hover:underline font-bold"
                  >
                    Obtener Clave Gratis ↗
                  </a>
                </div>
                <input
                  type="password"
                  value={globalGeminiKey}
                  onChange={(e) => handleSaveGlobalSettings(e.target.value)}
                  placeholder="Pega tu clave de Google AI Studio (AIzaSy...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 mt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="bg-violet-600 hover:bg-violet-750 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
