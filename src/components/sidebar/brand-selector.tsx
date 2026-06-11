import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Search, X, Clock, AlertTriangle } from 'lucide-react';
import { useBrand } from '@/lib/contexts/brand-context';
import type { Brand, BrandBlock, Marker } from '@/lib/db/types';
import { db } from '@/lib/db/local-storage';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface BrandSelectorProps {
  blocks?: BrandBlock[];
  markers?: Marker[];
  hideProgress?: boolean;
}

export function BrandSelector({ blocks, markers, hideProgress = false }: BrandSelectorProps) {
  const { brands, activeBrand, setActiveBrand, refreshBrands, createBrand } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [localBlocks, setLocalBlocks] = useState<BrandBlock[]>([]);
  const [localMarkers, setLocalMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    refreshBrands();
  }, [refreshBrands]);

  useEffect(() => {
    if (blocks && markers) return;
    if (!activeBrand) return;
    const brandId = activeBrand.id;
    let cancelled = false;
    async function loadData() {
      const [fetchedBlocks, fetchedMarkers] = await Promise.all([
        db.getBrandBlocks(brandId),
        db.getMarkers(brandId),
      ]);
      if (!cancelled) {
        setLocalBlocks(fetchedBlocks);
        setLocalMarkers(fetchedMarkers);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [activeBrand, blocks, markers]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter(b => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }, [brands, search]);

  const handleSelect = (brand: Brand) => {
    setActiveBrand(brand);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createBrand(newName.trim());
      setNewName('');
      setShowCreateForm(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create brand:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') {
      setShowCreateForm(false);
      setNewName('');
    }
  };

  const generatedSlug = newName.trim() ? slugify(newName.trim()) : '';

  // Calculate progress and markers for active brand
  const activeBlocks = blocks || localBlocks;
  const activeMarkers = markers || localMarkers;
  const totalBlocks = 13;
  const validatedCount = activeBlocks.filter(b => b.status === 'validado').length;
  const percentage = Math.round((validatedCount / totalBlocks) * 100);

  const unresolvedMarkers = activeMarkers.filter(m => !m.resolved);
  const pendienteCount = unresolvedMarkers.filter(m => m.type === 'pendiente').length;
  const verificarCount = unresolvedMarkers.filter(m => m.type === 'verificar').length;

  return (
    <div className="flex flex-col gap-2">
      {/* Dropdown trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="truncate">
            {activeBrand ? activeBrand.name : 'Seleccionar marca…'}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
            {/* Search */}
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar marca…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Brand list */}
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-slate-400">No se encontraron marcas</p>
              ) : (
                filtered.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => handleSelect(brand)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                      activeBrand?.id === brand.id ? 'bg-violet-50 text-violet-700' : 'text-slate-700'
                    }`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{
                      backgroundColor: brand.status === 'activo' ? '#10B981' : brand.status === 'pausado' ? '#F59E0B' : '#94A3B8'
                    }} />
                    <span className="truncate font-medium">{brand.name}</span>
                  </button>
                ))
              )}
            </div>

            {/* Create new brand */}
            <div className="border-t border-slate-100 p-2">
              {showCreateForm ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nombre de la marca"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200"
                    autoFocus
                  />
                  {generatedSlug && (
                    <p className="px-1 text-xs text-slate-400">
                      Slug: <span className="font-mono text-slate-500">{generatedSlug}</span>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim()}
                      className="flex-1 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                    >
                      Crear
                    </button>
                    <button
                      onClick={() => { setShowCreateForm(false); setNewName(''); }}
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-violet-600 transition-colors hover:bg-violet-50"
                >
                  <Plus className="h-4 w-4" />
                  Nueva marca
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compact progress bar under brand name */}
      {activeBrand && !hideProgress && (
        <div className="mt-1.5 px-1 flex items-center justify-between gap-2.5 text-[10px] text-slate-400 font-medium select-none">
          {/* Progress percentage and count */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-700 font-semibold">{percentage}%</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{validatedCount}/{totalBlocks}</span>
          </div>

          {/* Thin progress bar */}
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
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
  );
}
