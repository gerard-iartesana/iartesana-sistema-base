'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Users, Shield, Key, Eye, EyeOff, Save, Check, RefreshCw, Activity, CheckSquare, Square } from 'lucide-react';
import { db } from '@/lib/db/local-storage';
import type { Member, Brand, ActivityLog, MemberRole } from '@/lib/db/types';

interface SettingsLabProps {
  onSaveKey?: (key: string) => void;
  onUpdate?: () => void;
}

export function SettingsLab({ onSaveKey, onUpdate }: SettingsLabProps) {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'users' | 'activity'>('ai');
  
  // Member edit state helper
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [memberEdits, setMemberEdits] = useState<Record<string, { role: MemberRole; allowed_brands: string[]; can_write: boolean }>>({});

  const loadData = async () => {
    try {
      const userRes = await db.getCurrentUser();
      setCurrentUser(userRes);

      // Admins load all brands for permissions, regardless of user scope
      // Wait, we want to fetch brands from supabase directly if possible, or just call getBrands.
      // If the current user is admin, getBrands returns all anyway.
      const brandsRes = await db.getBrands();
      setBrands(brandsRes);

      if (userRes?.role === 'admin') {
        const membersRes = await db.getMembers();
        setMembers(membersRes);

        // Prepopulate edit states for all members
        const edits: typeof memberEdits = {};
        membersRes.forEach(m => {
          edits[m.id] = {
            role: m.role,
            allowed_brands: m.allowed_brands || [],
            can_write: m.can_write !== false
          };
        });
        setMemberEdits(edits);

        const logsRes = await db.getActivityLogs();
        setLogs(logsRes);
      }
    } catch (error) {
      console.error('[SettingsLab] Failed to load data:', error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setApiKey(localStorage.getItem('gemini_api_key') || '');
    }
    loadData();
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    if (onSaveKey) onSaveKey(apiKey.trim());
    if (onUpdate) onUpdate();
    alert('Clave API de Gemini guardada correctamente.');
  };

  const handleToggleBrandPermission = (memberId: string, brandId: string) => {
    const current = memberEdits[memberId];
    if (!current) return;

    let updatedBrands: string[];
    if (current.allowed_brands.includes(brandId)) {
      updatedBrands = current.allowed_brands.filter(id => id !== brandId);
    } else {
      updatedBrands = [...current.allowed_brands, brandId];
    }

    setMemberEdits(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        allowed_brands: updatedBrands
      }
    }));
  };

  const handleSaveMemberPermissions = async (memberId: string) => {
    const edits = memberEdits[memberId];
    if (!edits) return;

    setSavingMemberId(memberId);
    try {
      const ok = await db.updateMemberPermissions(
        memberId,
        edits.role,
        edits.allowed_brands,
        edits.can_write
      );
      if (ok) {
        // Refresh local member list
        const updatedMembers = await db.getMembers();
        setMembers(updatedMembers);
        
        // Refresh activity log
        const logsRes = await db.getActivityLogs();
        setLogs(logsRes);
        
        if (onUpdate) onUpdate();
      } else {
        alert('Error al actualizar permisos.');
      }
    } catch (e) {
      console.error(e);
      alert('Error al actualizar permisos.');
    } finally {
      setSavingMemberId(null);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-violet-600 animate-spin-slow" />
          <div>
            <h2 className="text-base font-bold text-slate-800">Panel de Configuración</h2>
            <p className="text-xs text-slate-400">Gestiona la Inteligencia Artificial, permisos de clientes y registros de actividad</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition"
          title="Recargar datos"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-6 bg-slate-50/20">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition -mb-px ${
            activeTab === 'ai'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          Servicios de IA
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition -mb-px ${
                activeTab === 'users'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Gestor de Usuarios
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition -mb-px ${
                activeTab === 'activity'
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Historial de Actividad
            </button>
          </>
        )}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {/* Tab 1: AI configuration */}
        {activeTab === 'ai' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100 flex items-start gap-3">
              <Shield className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-800">Seguridad & Almacenamiento Local</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tu clave API de Google Gemini se almacena exclusivamente de forma local en tu navegador (`localStorage`).
                  Ninguna clave se envía a servidores externos ni a bases de datos compartidas.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Clave API de Google Gemini</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-violet-600 hover:underline font-bold"
                  >
                    Obtener Clave Gratis en Google AI Studio ↗
                  </a>
                </div>
                <div className="relative max-w-lg">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Pega tu clave AIzaSy..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-xs text-slate-700 font-mono placeholder-slate-400 outline-none focus:border-violet-500 transition"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Requerida para utilizar el Copiloto IA y generar imágenes de módulos corporativos.</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveApiKey}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" />
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: User Manager */}
        {activeTab === 'users' && isAdmin && (
          <div className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-4 py-3">Usuario / Email</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Escritura</th>
                    <th className="px-4 py-3">Acceso a Marcas</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {members.map(member => {
                    const edits = memberEdits[member.id] || {
                      role: member.role,
                      allowed_brands: member.allowed_brands || [],
                      can_write: member.can_write !== false
                    };
                    const isCurrentUser = member.id === currentUser?.id;

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Name and Email */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-[10px]">
                                {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-800">{member.name || 'Sin nombre'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{member.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role Select */}
                        <td className="px-4 py-3">
                          {isCurrentUser ? (
                            <span className="inline-flex rounded bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600 border border-violet-100">
                              Administrador (Tú)
                            </span>
                          ) : (
                            <select
                              value={edits.role}
                              onChange={e => {
                                setMemberEdits(prev => ({
                                  ...prev,
                                  [member.id]: {
                                    ...prev[member.id],
                                    role: e.target.value as MemberRole
                                  }
                                }));
                              }}
                              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none focus:border-violet-300"
                            >
                              <option value="admin">Administrador</option>
                              <option value="editor">Editor / Cliente</option>
                            </select>
                          )}
                        </td>

                        {/* Write Permission */}
                        <td className="px-4 py-3">
                          {isCurrentUser ? (
                            <span className="text-slate-400 font-medium">Sí</span>
                          ) : (
                            <button
                              onClick={() => {
                                setMemberEdits(prev => ({
                                  ...prev,
                                  [member.id]: {
                                    ...prev[member.id],
                                    can_write: !prev[member.id].can_write
                                  }
                                }));
                              }}
                              className="text-slate-500 hover:text-slate-700 transition"
                            >
                              {edits.can_write ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                  <CheckSquare className="h-4 w-4" /> Sí
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Square className="h-4 w-4" /> No (Lectura)
                                </span>
                              )}
                            </button>
                          )}
                        </td>

                        {/* Allowed Brands */}
                        <td className="px-4 py-3">
                          {edits.role === 'admin' ? (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Todas las marcas</span>
                          ) : (
                            <div className="flex flex-col gap-1 max-w-[240px]">
                              {brands.map(brand => {
                                const isChecked = edits.allowed_brands.includes(brand.id);
                                return (
                                  <label key={brand.id} className="flex items-center gap-1.5 cursor-pointer text-[11px] select-none text-slate-600 hover:text-slate-800">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleBrandPermission(member.id, brand.id)}
                                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <span className="truncate">{brand.name}</span>
                                  </label>
                                );
                              })}
                              {brands.length === 0 && <span className="text-[10px] text-slate-400">Crea marcas primero</span>}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleSaveMemberPermissions(member.id)}
                            disabled={savingMemberId === member.id}
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white rounded px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50"
                          >
                            {savingMemberId === member.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Aplicar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Activity Logs */}
        {activeTab === 'activity' && isAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700">Historial reciente de acciones de usuarios</h3>
              <span className="text-[10px] text-slate-400 font-mono">Mostrando logs recientes ({logs.length})</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] uppercase tracking-wider text-slate-400 font-bold sticky top-0 z-10">
                    <th className="px-4 py-2.5">Fecha / Hora</th>
                    <th className="px-4 py-2.5">Usuario</th>
                    <th className="px-4 py-2.5">Acción</th>
                    <th className="px-4 py-2.5">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700 font-mono">
                  {logs.map(log => {
                    let actionColor = 'bg-slate-100 text-slate-650';
                    if (log.action.includes('update')) actionColor = 'bg-blue-50 text-blue-600 border border-blue-100';
                    if (log.action.includes('create')) actionColor = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                    if (log.action.includes('delete')) actionColor = 'bg-red-50 text-red-600 border border-red-100';
                    if (log.action.includes('permissions')) actionColor = 'bg-violet-50 text-violet-600 border border-violet-100';

                    return (
                      <tr key={log.id} className="hover:bg-slate-100/30 transition-colors">
                        <td className="px-4 py-2 text-slate-400 shrink-0 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-slate-700 font-semibold">{log.email}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${actionColor}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-500 font-sans text-xs">{log.details}</td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs font-sans">
                        No hay actividad registrada en el historial todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
