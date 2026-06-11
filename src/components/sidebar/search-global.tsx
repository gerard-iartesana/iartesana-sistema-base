'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import { useBrand } from '@/lib/contexts/brand-context';

interface SearchResultItem {
  type: string;
  brand_id: string;
  title: string;
  snippet: string;
  id: string;
}

export function SearchGlobal() {
  const { brands, setActiveBrand } = useBrand();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      const found = await db.searchGlobal(q);
      setResults(found.slice(0, 20) as SearchResultItem[]);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = async (result: SearchResultItem) => {
    const brand = await db.getBrand(result.brand_id);
    if (brand) setActiveBrand(brand);
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  // Helper to get brand name from brand_id
  const getBrandName = (brandId: string): string => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Marca desconocida';
  };

  // Group results by brand_id
  const grouped = results.reduce<Record<string, { brandName: string; brandId: string; items: SearchResultItem[] }>>((acc, r) => {
    if (!acc[r.brand_id]) {
      acc[r.brand_id] = { brandName: getBrandName(r.brand_id), brandId: r.brand_id, items: [] };
    }
    acc[r.brand_id].items.push(r);
    return acc;
  }, {});

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-violet-300 focus-within:ring-1 focus-within:ring-violet-200">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar en todo…"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {Object.values(grouped).map(({ brandName, brandId, items }) => (
            <div key={brandId}>
              <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-slate-500">{brandName}</span>
              </div>
              {items.map((item, i) => (
                <button
                  key={`${item.id}-${i}`}
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-600">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{item.snippet}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white p-4 text-center shadow-lg">
          <p className="text-xs text-slate-400">Sin resultados para &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
