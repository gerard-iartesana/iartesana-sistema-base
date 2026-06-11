'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useBrand } from '@/lib/contexts/brand-context';
import { MarkdownExport } from '@/components/export/markdown-export';
import { PromptGlobal } from '@/components/export/prompt-global';
import { LiveLink } from '@/components/export/live-link';
import { Presentation } from '@/components/export/presentation';
import { ArrowLeft, FileText, MessageSquare, Link2, MonitorPlay } from 'lucide-react';

type ExportTab = 'markdown' | 'prompt' | 'livelink' | 'presentacion';

export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { brands, activeBrand, setActiveBrand } = useBrand();
  const slug = params.slug as string;

  const [activeTab, setActiveTab] = useState<ExportTab>('markdown');
  const [showPresentation, setShowPresentation] = useState(false);

  // Set active brand based on slug
  useEffect(() => {
    if (brands.length > 0 && slug) {
      const found = brands.find(b => b.slug === slug);
      if (found && found.id !== activeBrand?.id) {
        setActiveBrand(found);
      }
    }
  }, [brands, slug]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!activeBrand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500">Marca no encontrada</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-violet-600 hover:underline text-sm"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (showPresentation) {
    return <Presentation />;
  }

  const tabs: { key: ExportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'markdown', label: 'Documento .md', icon: <FileText size={16} /> },
    { key: 'prompt', label: 'Prompt Global', icon: <MessageSquare size={16} /> },
    { key: 'livelink', label: 'Live Link', icon: <Link2 size={16} /> },
    { key: 'presentacion', label: 'Presentación', icon: <MonitorPlay size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">{activeBrand.name}</h1>
              <p className="text-xs text-slate-400">Panel de exportaciones</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === 'presentacion') {
                    setShowPresentation(true);
                  } else {
                    setActiveTab(tab.key);
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.key
                    ? 'border-violet-500 text-violet-700 bg-violet-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'markdown' && <MarkdownExport />}
        {activeTab === 'prompt' && <PromptGlobal />}
        {activeTab === 'livelink' && <LiveLink />}
      </div>
    </div>
  );
}
