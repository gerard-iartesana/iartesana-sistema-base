'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useBrand } from '@/lib/contexts/brand-context';
import { BrandSelector } from '@/components/sidebar/brand-selector';
import { BlockNav } from '@/components/blocks/block-nav';
import { BlockEditor } from '@/components/blocks/block-editor';
import { NamingLab } from '@/components/blocks/naming-lab';
import { KnowledgeLibrary } from '@/components/blocks/knowledge-library';
import { RulesEditor } from '@/components/blocks/rules-editor';
import { CopilotPanel } from '@/components/copilot/copilot-panel';
import { db } from '@/lib/db/local-storage';
import { BrandBlock, Marker } from '@/lib/db/types';
import { LogOut, Sparkles, FileOutput } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const { activeBrand } = useBrand();
  const [selectedStage, setSelectedStage] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [selectedBlockId, setSelectedBlockId] = useState<number>(1);
  const [brandBlocks, setBrandBlocks] = useState<BrandBlock[]>([]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [editorKey, setEditorKey] = useState(0);

  // Load brand blocks and markers when active brand changes
  useEffect(() => {
    if (activeBrand) {
      loadData();
    } else {
      setBrandBlocks([]);
      setMarkers([]);
    }
  }, [activeBrand?.id]);

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

  const handleBlockUpdate = () => {
    loadData();
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
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 h-screen sticky top-0">
        {/* Header */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2.5">
            <img src="/assets/logo/logo.svg" alt="iARTESANA Logo" className="w-8 h-8 object-contain shrink-0" />
            <div>
              <h1 className="text-sm font-bold text-slate-800">Sistema Base</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Núcleo de Contexto</p>
            </div>
          </div>
        </div>

        {/* Brand Selector */}
        <div className="px-4 py-3">
          <BrandSelector blocks={brandBlocks} markers={markers} />
        </div>

        {/* Block Navigation */}
        {activeBrand && (
          <div className="flex-1 overflow-y-auto flex flex-col justify-between py-2">
            <div>
              <BlockNav
                selectedStage={selectedStage}
                selectedBlockId={selectedBlockId}
                onSelectStage={setSelectedStage}
                onSelectBlock={setSelectedBlockId}
                brandBlocks={brandBlocks}
              />

              {/* Export Link at the same level as block stage accordion headers */}
              <div className="px-4 py-1">
                <Link
                  href={`/marca/${activeBrand.slug}/exportar`}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50/50 hover:text-slate-700 transition-colors rounded-lg"
                >
                  <FileOutput className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">Panel de exportaciones</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0 z-30">
          {/* Left side: Active brand metadata or name */}
          <div className="flex items-center gap-2">
            {activeBrand ? (
              <>
                <span className="text-sm font-semibold text-slate-800">{activeBrand.name}</span>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">v{activeBrand.doc_version}</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-400">iARTESANA app</span>
            )}
          </div>

          {/* Right side: User Avatar + Logout Button */}
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center cursor-help shadow-sm" title={`${user.name || user.email} (${user.role})`}>
              <span className="text-xs font-semibold text-violet-700">
                {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
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
                {/* Block Editor */}
                <div className="flex-1 p-6">
                  <BlockEditor
                    key={`editor-${activeBrand.id}-${selectedBlockId}-${editorKey}`}
                    brandId={activeBrand.id}
                    blockId={selectedBlockId}
                    onSave={handleBlockUpdate}
                  />

                  {/* Special UIs for certain blocks */}
                  {selectedBlockId === 3 && (
                    <div className="mt-6">
                      <NamingLab brandId={activeBrand.id} />
                    </div>
                  )}
                  {selectedBlockId === 10 && (
                    <div className="mt-6">
                      <KnowledgeLibrary brandId={activeBrand.id} />
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
                </div>
              </div>

              {/* Copilot Panel - manages its own open/close state */}
              <CopilotPanel />
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
    </div>
  );
}
