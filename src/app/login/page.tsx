'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useState } from 'react';

export default function LoginPage() {
  const { loginWithGoogle, isLoading } = useAuth();
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setError('');
      await loginWithGoogle();
    } catch {
      setError('Error al conectar con Google. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50">
      <div className="w-full max-w-sm">
        {/* Logo & title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
            <span className="text-2xl font-bold text-white">iA</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Sistema Base</h1>
          <p className="mt-1.5 text-sm text-slate-500">Núcleo de Contexto para marcas</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-800 text-center mb-2">
            Iniciar sesión
          </h2>
          <p className="text-xs text-slate-400 text-center mb-6">
            Accede con tu cuenta de Google vinculada a iARTESANA
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Google icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          <p className="mt-4 text-[10px] text-slate-400 text-center">
            Solo usuarios autorizados del equipo iARTESANA
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-slate-400">
          iARTESANA © {new Date().getFullYear()} — Sistema Base v0.1.0
        </p>
      </div>
    </div>
  );
}
