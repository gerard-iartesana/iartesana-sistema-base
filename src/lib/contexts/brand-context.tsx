'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Brand } from '../db/types';
import { db } from '../db/local-storage';
import { useAuth } from './auth-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BrandContextValue {
  brands: Brand[];
  activeBrand: Brand | null;
  isLoading: boolean;
  setActiveBrand: (brand: Brand | null) => void;
  refreshBrands: () => Promise<void>;
  createBrand: (name: string) => Promise<Brand>;
  deleteBrand: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const BrandContext = createContext<BrandContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Storage key for persisting active brand selection
// ---------------------------------------------------------------------------
const ACTIVE_BRAND_KEY = 'sb_active_brand_id';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
interface BrandProviderProps {
  children: ReactNode;
}

export function BrandProvider({ children }: BrandProviderProps) {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrandState] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBrands = useCallback(async () => {
    try {
      const allBrands = await db.getBrands();
      setBrands(allBrands);
    } catch (error) {
      console.error('[brand] Failed to load brands:', error);
    }
  }, []);

  // Load brands on mount when user is available
  useEffect(() => {
    if (!user) {
      setBrands([]);
      setActiveBrandState(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBrands() {
      setIsLoading(true);
      try {
        const allBrands = await db.getBrands();
        if (cancelled) return;

        setBrands(allBrands);

        // Restore persisted active brand if available
        const savedBrandId =
          typeof window !== 'undefined'
            ? localStorage.getItem(ACTIVE_BRAND_KEY)
            : null;

        if (savedBrandId) {
          const saved = allBrands.find((b) => b.id === savedBrandId);
          if (saved) {
            setActiveBrandState(saved);
          } else if (allBrands.length > 0) {
            setActiveBrandState(allBrands[0]);
          }
        } else if (allBrands.length > 0) {
          setActiveBrandState(allBrands[0]);
        }
      } catch (error) {
        console.error('[brand] Failed to load brands:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadBrands();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const setActiveBrand = useCallback((brand: Brand | null) => {
    setActiveBrandState(brand);
    if (typeof window !== 'undefined') {
      if (brand) {
        localStorage.setItem(ACTIVE_BRAND_KEY, brand.id);
      } else {
        localStorage.removeItem(ACTIVE_BRAND_KEY);
      }
    }
  }, []);

  const handleCreateBrand = useCallback(
    async (name: string): Promise<Brand> => {
      const newBrand = await db.createBrand({ name });
      const allBrands = await db.getBrands();
      setBrands(allBrands);

      // Auto-select the newly created brand
      setActiveBrand(newBrand);

      return newBrand;
    },
    [user, setActiveBrand]
  );

  const handleDeleteBrand = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await db.deleteBrand(id);
      if (success) {
        const allBrands = await db.getBrands();
        setBrands(allBrands);

        // If the deleted brand was the active one, select the first remaining brand
        if (activeBrand?.id === id) {
          setActiveBrand(allBrands.length > 0 ? allBrands[0] : null);
        }
      }
      return success;
    },
    [activeBrand, setActiveBrand]
  );

  const value: BrandContextValue = {
    brands,
    activeBrand,
    isLoading,
    setActiveBrand,
    refreshBrands,
    createBrand: handleCreateBrand,
    deleteBrand: handleDeleteBrand,
  };

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useBrand(): BrandContextValue {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
