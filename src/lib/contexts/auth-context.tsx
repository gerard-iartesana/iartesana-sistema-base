'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Member } from '../db/types';
import { db } from '../db/local-storage';
import { supabase } from '../db/supabase-client';
import { useRouter, usePathname } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthContextValue {
  user: Member | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
const PUBLIC_PATHS = ['/login', '/share'];

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check for existing session on mount
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const currentUser = await db.getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
        }
      } catch (error: any) {
        console.error('[auth] Failed to check session:', error);
        alert(`Error de autenticación: ${error.message || error}`);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    checkSession();

    // Listen for auth state changes (e.g. after Google OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            const member = await db.getCurrentUser();
            setUser(member);
          } catch (error: any) {
            console.error('[auth] SIGNED_IN get member error:', error);
            alert(`Error de sesión: ${error.message || error}`);
          } finally {
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to /login if not authenticated and not on a public path
  useEffect(() => {
    if (isLoading) return;
    const isPublicPath = PUBLIC_PATHS.some((p) => pathname?.startsWith(p));
    if (!user && !isPublicPath) {
      router.replace('/login');
    } else if (user && pathname === '/login') {
      router.replace('/');
    }
  }, [user, isLoading, pathname, router]);

  const handleLoginWithGoogle = useCallback(async (): Promise<void> => {
    try {
      await db.loginWithGoogle();
    } catch (error) {
      console.error('[auth] Google login error:', error);
    }
  }, []);

  const handleLogout = useCallback(async (): Promise<void> => {
    try {
      await db.logout();
      setUser(null);
      router.replace('/login');
    } catch (error) {
      console.error('[auth] Logout error:', error);
    }
  }, [router]);

  const value: AuthContextValue = {
    user,
    isLoading,
    loginWithGoogle: handleLoginWithGoogle,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
