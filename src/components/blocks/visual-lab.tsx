'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db/local-storage';
import { useBrand } from '@/lib/contexts/brand-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { ARCHETYPES, parseArchetypes } from './archetype-lab';
import { 
  Upload, 
  Trash2, 
  Sparkles, 
  Check, 
  Copy, 
  FileText, 
  Smartphone, 
  CreditCard, 
  Shirt,
  Info,
  Eye,
  Activity,
  AlertCircle
} from 'lucide-react';

interface VisualLabProps {
  brandId: string;
  onUpdate: () => void;
}

// Basic color naming dictionary and distance calculator
interface ColorNameDef {
  name: string;
  r: number;
  g: number;
  b: number;
  role: string;
}

const COLOR_NAMES: ColorNameDef[] = [
  { name: 'Negro Profundo', r: 15, g: 15, b: 17, role: 'Fondo / Contraste' },
  { name: 'Blanco Puro', r: 255, g: 255, b: 255, role: 'Luz / Base' },
  { name: 'Gris Neutro', r: 156, g: 163, b: 175, role: 'Texto Secundario' },
  { name: 'Morado Corporativo', r: 115, g: 97, b: 168, role: 'Identidad / Esencia' },
  { name: 'Magenta Vibrante', r: 227, g: 89, b: 156, role: 'Acento / Dinamismo' },
  { name: 'Azul Eléctrico', r: 54, g: 168, b: 224, role: 'Confianza / Profesional' },
  { name: 'Verde Orgánico', r: 133, g: 191, b: 87, role: 'Estabilidad / Éxito' },
  { name: 'Rojo Alerta', r: 239, g: 68, b: 68, role: 'Foco / Atención' },
  { name: 'Naranja Cálido', r: 249, g: 115, b: 22, role: 'Energía / Acción' },
  { name: 'Amarillo Brillante', r: 234, g: 179, b: 8, role: 'Optimismo / Detalle' },
  { name: 'Azul Marino', r: 30, g: 41, b: 59, role: 'Soporte / Estructura' },
  { name: 'Rosa Pastel', r: 244, g: 196, b: 243, role: 'Suavidad / Detalle' },
];

interface PantoneDef {
  code: string;
  r: number;
  g: number;
  b: number;
}

const PANTONE_DICTIONARY: PantoneDef[] = [
  { code: 'Pantone Black C', r: 44, g: 44, b: 44 },
  { code: 'Pantone Cool Gray 1 C', r: 232, g: 233, b: 232 },
  { code: 'Pantone Cool Gray 7 C', r: 151, g: 153, b: 155 },
  { code: 'Pantone Cool Gray 11 C', r: 83, g: 86, b: 90 },
  { code: 'Pantone 293 C (Azul Real)', r: 0, g: 61, b: 165 },
  { code: 'Pantone 286 C (Azul Marino)', r: 0, g: 51, b: 160 },
  { code: 'Pantone 300 C (Azul Corporativo)', r: 0, g: 94, b: 184 },
  { code: 'Pantone 219 C (Rosa Fuerte)', r: 218, g: 24, b: 132 },
  { code: 'Pantone 185 C (Rojo Vivo)', r: 228, g: 0, b: 43 },
  { code: 'Pantone 485 C (Rojo)', r: 218, g: 41, b: 28 },
  { code: 'Pantone 021 C (Naranja)', r: 254, g: 80, b: 0 },
  { code: 'Pantone 116 C (Amarillo)', r: 255, g: 205, b: 0 },
  { code: 'Pantone 354 C (Verde Brillante)', r: 0, g: 177, b: 64 },
  { code: 'Pantone 347 C (Verde)', r: 0, g: 154, b: 68 },
  { code: 'Pantone 2685 C (Morado Oscuro)', r: 58, g: 0, b: 120 },
  { code: 'Pantone 2587 C (Morado)', r: 130, g: 70, b: 175 },
  { code: 'Pantone Reflex Blue C', r: 10, g: 17, b: 114 },
  { code: 'Pantone Warm Red C', r: 249, g: 66, b: 58 },
  { code: 'Pantone 3278 C (Turquesa Oscuro)', r: 0, g: 139, b: 122 },
  { code: 'Pantone 312 C (Turquesa)', r: 0, g: 169, b: 224 },
  { code: 'Pantone 137 C (Amarillo Oro)', r: 255, g: 163, b: 0 },
  { code: 'Pantone 7427 C (Burdeos)', r: 158, g: 27, b: 50 },
  { code: 'Pantone 226 C (Fucsia)', r: 216, g: 0, b: 94 },
  { code: 'Pantone 375 C (Verde Lima)', r: 118, g: 192, b: 67 },
  { code: 'Pantone 424 C (Plomo)', r: 112, g: 115, b: 114 },
  { code: 'Pantone 877 C (Plata)', r: 138, g: 144, b: 151 },
  { code: 'Pantone 871 C (Oro)', r: 134, g: 117, b: 79 },
  { code: 'Pantone 15-0343 C (Greenery)', r: 136, g: 176, b: 75 },
  { code: 'Pantone 18-3838 C (Ultra Violet)', r: 95, g: 75, b: 139 },
  { code: 'Pantone 16-1546 C (Living Coral)', r: 255, g: 111, b: 97 },
  { code: 'Pantone 19-4052 C (Classic Blue)', r: 15, g: 76, b: 129 },
  { code: 'Pantone 17-5104 C (Ultimate Gray)', r: 147, g: 149, b: 151 },
  { code: 'Pantone 13-0647 C (Illuminating)', r: 245, g: 223, b: 77 },
  { code: 'Pantone 17-3938 C (Very Peri)', r: 102, g: 103, b: 171 },
  { code: 'Pantone 18-1750 C (Viva Magenta)', r: 190, g: 52, b: 85 },
  { code: 'Pantone 13-1023 C (Peach Fuzz)', r: 255, g: 190, b: 152 },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let rgb = hex.replace(/^#/, '');
  if (rgb.length === 3) {
    rgb = rgb.split('').map(char => char + char).join('');
  }
  const r = parseInt(rgb.substring(0, 2), 16);
  const g = parseInt(rgb.substring(2, 4), 16);
  const b = parseInt(rgb.substring(4, 6), 16);
  return { r, g, b };
}

function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
  const rPrime = r / 255;
  const gPrime = g / 255;
  const bPrime = b / 255;

  const k = 1 - Math.max(rPrime, gPrime, bPrime);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = Math.round(((1 - rPrime - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gPrime - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bPrime - k) / (1 - k)) * 100);
  const kPercent = Math.round(k * 100);

  return { c, m, y, k: kPercent };
}

function getClosestPantone(r: number, g: number, b: number): string {
  let minDistance = Infinity;
  let closest = PANTONE_DICTIONARY[0].code;

  for (const p of PANTONE_DICTIONARY) {
    const dist = Math.sqrt(
      Math.pow(r - p.r, 2) + Math.pow(g - p.g, 2) + Math.pow(b - p.b, 2)
    );
    if (dist < minDistance) {
      minDistance = dist;
      closest = p.code;
    }
  }
  return closest;
}

function getClosestColorName(hex: string): { name: string; role: string } {
  let rgb = hex.replace(/^#/, '');
  if (rgb.length === 3) {
    rgb = rgb.split('').map(char => char + char).join('');
  }
  const r = parseInt(rgb.substring(0, 2), 16);
  const g = parseInt(rgb.substring(2, 4), 16);
  const b = parseInt(rgb.substring(4, 6), 16);

  let minDistance = Infinity;
  let closest = COLOR_NAMES[0];

  for (const c of COLOR_NAMES) {
    const dist = Math.sqrt(
      Math.pow(r - c.r, 2) + Math.pow(g - c.g, 2) + Math.pow(b - c.b, 2)
    );
    if (dist < minDistance) {
      minDistance = dist;
      closest = c;
    }
  }
  return { name: closest.name, role: closest.role };
}

// Relative luminance for WCAG contrast
function getLuminance(hex: string): number {
  let rgb = hex.replace(/^#/, '');
  if (rgb.length === 3) {
    rgb = rgb.split('').map(char => char + char).join('');
  }
  const r = parseInt(rgb.substring(0, 2), 16);
  const g = parseInt(rgb.substring(2, 4), 16);
  const b = parseInt(rgb.substring(4, 6), 16);

  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

// Extraction algorithm via canvas pixel sampling
function extractColorsFromImage(imgElement: HTMLImageElement): string[] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return ['#7361a8', '#e3599c', '#36a8e0', '#85bf57'];

  const scale = 50; // Analyze a binned 50x50 version of the image
  canvas.width = scale;
  canvas.height = scale;
  ctx.drawImage(imgElement, 0, 0, scale, scale);

  const imgData = ctx.getImageData(0, 0, scale, scale).data;
  const colorCounts: Record<string, number> = {};

  for (let i = 0; i < imgData.length; i += 4) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    const a = imgData[i + 3];

    // Ignore transparent pixels
    if (a < 50) continue;

    // Ignore very dark and very bright pixels unless binned
    const isWhite = r > 240 && g > 240 && b > 240;
    const isBlack = r < 20 && g < 20 && b < 20;

    const roundFactor = 24;
    const cr = Math.round(r / roundFactor) * roundFactor;
    const cg = Math.round(g / roundFactor) * roundFactor;
    const cb = Math.round(b / roundFactor) * roundFactor;

    const key = `${Math.min(255, cr)},${Math.min(255, cg)},${Math.min(255, cb)}`;
    if (!isWhite && !isBlack) {
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    } else {
      colorCounts[key] = (colorCounts[key] || 0) + 0.1; // Low weight for black/white
    }
  }

  const sorted = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => {
      const [r, g, b] = key.split(',').map(Number);
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    });

  // Top 4 dominant colors
  const defaults = ['#7361a8', '#e3599c', '#36a8e0', '#85bf57'];
  const results = sorted.slice(0, 4);
  while (results.length < 4) {
    const nextDefault = defaults.find(d => !results.includes(d));
    results.push(nextDefault || '#7361a8');
  }
  return results;
}

export function VisualLab({ brandId, onUpdate }: VisualLabProps) {
  const { activeBrand, refreshBrands, setActiveBrand } = useBrand();
  const { user } = useAuth();
  
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  // Interactive Scanning States
  const [isScanning, setIsScanning] = useState(false);
  const [analysisReport, setAnalysisReport] = useState<{
    geometry: string;
    psychology: string;
    coherence: string;
    aspectRatio: string;
    recommendation: string;
  } | null>(null);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Mockups states
  const [cardFlipped, setCardFlipped] = useState(false);
  const [mobileTab, setMobileTab] = useState<'splash' | 'home'>('splash');
  const [mockupCategory, setMockupCategory] = useState<'card' | 'mobile' | 'letter' | 'merch'>('card');
  const [logoDimensions, setLogoDimensions] = useState({ width: 0, height: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Set initial logo from database
  useEffect(() => {
    if (activeBrand?.logo_path) {
      setLogoSrc(activeBrand.logo_path);
      // Analyze colors on load
      const img = new Image();
      img.onload = () => {
        setLogoDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        const colors = extractColorsFromImage(img);
        setExtractedColors(colors);
      };
      img.src = activeBrand.logo_path;
    } else {
      setLogoSrc(null);
      setExtractedColors([]);
      setAnalysisReport(null);
    }
  }, [activeBrand?.logo_path, activeBrand?.id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setLogoSrc(base64);
      setAnalysisReport(null); // Reset report

      // Save to database
      try {
        const updated = await db.updateBrand(brandId, { logo_path: base64 });
        if (updated) {
          await refreshBrands();
          setActiveBrand(updated);
          onUpdate();
        }
      } catch (err) {
        console.error('[VisualLab] Failed to save logo:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    setLogoSrc(null);
    setExtractedColors([]);
    setAnalysisReport(null);
    setLogoDimensions({ width: 0, height: 0 });

    try {
      const updated = await db.updateBrand(brandId, { logo_path: null });
      if (updated) {
        await refreshBrands();
        setActiveBrand(updated);
        onUpdate();
      }
    } catch (err) {
      console.error('[VisualLab] Failed to remove logo:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(text);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Run the visual scanner audit simulation
  const runAnalysis = async () => {
    if (!logoSrc) return;
    setIsScanning(true);
    setAnalysisReport(null);

    // Wait 2.2s for scanning animation
    await new Promise(resolve => setTimeout(resolve, 2200));

    // Get arquetipos to contextualize
    let archetypesStr = '';
    try {
      const blocks = await db.getBrandBlocks(brandId);
      const b4 = blocks.find(b => b.block_id === 4);
      if (b4?.content_md) {
        const selected = parseArchetypes(b4.content_md);
        const names = Object.keys(selected);
        if (names.length > 0) {
          archetypesStr = names.join(' y ');
        }
      }
    } catch (err) {
      console.error(err);
    }

    const ratio = logoDimensions.width / (logoDimensions.height || 1);
    let geometry = '';
    let aspectRatioText = `${logoDimensions.width}px × ${logoDimensions.height}px`;
    if (ratio > 1.35) {
      geometry = 'Composición apaisada / horizontal. Posee una distribución lineal excelente para cabeceras web, barras de navegación y documentos corporativos. Asegúrate de que el isotipo mantenga legibilidad si se separa del logotipo textual.';
    } else if (ratio < 0.75) {
      geometry = 'Composición vertical / alta. Es ideal para etiquetas de embalaje, banderolas, y merchandising. En formatos digitales horizontales puede requerir una versión adaptada para evitar ocupar excesivo espacio vertical.';
    } else {
      geometry = 'Composición cuadrada / simétrica. Presenta un equilibrio perfecto en sus ejes. Ofrece una versatilidad sobresaliente para adaptarlo como favicon de la web, icono de aplicación móvil y perfiles en redes sociales.';
    }

    // Color psychology
    let psychology = 'Paleta cromática balanceada. ';
    if (extractedColors.length > 0) {
      const primaryHex = extractedColors[0];
      const nameAndRole = getClosestColorName(primaryHex);
      psychology += `Tu color dominante se clasifica como ${nameAndRole.name} (${primaryHex}). `;

      if (primaryHex.match(/#(73|6|5|8|9)[0-9a-f]/i)) {
        psychology += 'Transmite creatividad, innovación y transformación profunda, sugiriendo un enfoque visionario.';
      } else if (primaryHex.match(/#(3|2|1|0)[0-9a-f]/i)) {
        psychology += 'Evoca confianza, rigor profesional, comunicación transparente y espíritu de colectividad.';
      } else if (primaryHex.match(/#(8|a|9|b)[0-9a-f]/i)) {
        psychology += 'Representa crecimiento, estabilidad, respeto ambiental y sostenibilidad a largo plazo.';
      } else if (primaryHex.match(/#(e|f|d)[0-9a-f]/i)) {
        psychology += 'Proyecta pasión, energía activa, audacia y un carácter marcadamente individualista y retador.';
      } else {
        psychology += 'Aporta una estética neutral, elegante y minimalista que actúa como base premium para la marca.';
      }
    }

    // Archetype coherence
    let coherence = 'Alineación de marca consistente.';
    if (archetypesStr) {
      coherence = `¡Alineación alta! Los rasgos geométricos y la paleta cromática identificada complementan la personalidad definida para tus arquetipos clave: **${archetypesStr}**. `;
      const primaryHex = extractedColors[0] || '';
      if (archetypesStr.toLowerCase().includes('visionaria') && primaryHex.match(/#(73|6|5)/i)) {
        coherence += 'El tono morado dominante refuerza de manera directa la esencia creativa e inspiradora de la Visionaria.';
      } else if (archetypesStr.toLowerCase().includes('comprom') && primaryHex.match(/#(3|2|1)/i)) {
        coherence += 'El matiz azul principal sostiene visualmente la seriedad y el compromiso comunitario del arquetipo Comprometido.';
      } else {
        coherence += 'La composición genera un balance visual equilibrado que dota a la marca de versatilidad comunicativa.';
      }
    } else {
      coherence = 'Coherencia preliminar. Configura los arquetipos en el Bloque 4 para realizar una auditoría de alineación cruzada de identidad visual.';
    }

    // Readability checks
    let recommendation = 'Apto para todo tipo de aplicaciones.';
    if (extractedColors.length > 0) {
      const c1 = extractedColors[0];
      const darkRatio = getContrastRatio(c1, '#0F0F11');
      const lightRatio = getContrastRatio(c1, '#FFFFFF');

      if (darkRatio < 3.0) {
        recommendation = 'Precaución: El color dominante posee un contraste bajo sobre fondos oscuros. Para soportes digitales en modo noche, se recomienda utilizar la versión en negativo a una sola tinta (blanco puro).';
      } else if (lightRatio < 3.0) {
        recommendation = 'Precaución: El color principal tiene bajo contraste sobre fondo blanco. Asegúrate de emplear tipografías en negro o grises de alto contraste para el cuerpo del texto en papelería impresa.';
      } else {
        recommendation = 'Excelente contraste tanto en interfaces de fondo claro como oscuro. El color dominante garantiza accesibilidad nivel AA.';
      }
    }

    setAnalysisReport({
      geometry,
      psychology,
      coherence,
      aspectRatio: aspectRatioText,
      recommendation
    });
    setScannedImage(logoSrc);
    setIsScanning(false);
  };

  // Inline styles for 3D card flipping
  const cardStyle: React.CSSProperties = {
    perspective: '1000px',
  };
  const cardInnerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
    transformStyle: 'preserve-3d',
    transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };
  const cardFaceStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  };
  const cardBackFaceStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
  };

  const primaryColor = extractedColors[0] || '#7361a8';
  const secondaryColor = extractedColors[1] || '#e3599c';
  const accentColor = extractedColors[2] || '#36a8e0';
  const muteColor = extractedColors[3] || '#85bf57';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-200 mt-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-white">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Laboratorio de Conceptualización Visual
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sube el logotipo de tu marca, analiza su paleta y aplícalo a diferentes mockups interactivos.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Upload, Color Extraction and Analysis */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. UPLOADER CARD */}
          <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Logotipo de la Marca</span>
            </h4>

            {logoSrc ? (
              <div className="space-y-4">
                <div className="relative group rounded-lg border border-slate-800 p-6 bg-slate-900/40 flex items-center justify-center min-h-[140px] overflow-hidden">
                  <img 
                    ref={imageRef}
                    src={logoSrc} 
                    alt="Logo" 
                    className="max-h-[100px] object-contain transition-transform group-hover:scale-105"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setLogoDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                      const colors = extractColorsFromImage(img);
                      setExtractedColors(colors);
                    }}
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={handleRemoveLogo}
                      className="p-1.5 bg-red-950/80 hover:bg-red-900 text-red-400 hover:text-red-200 rounded-md border border-red-900/50 transition-colors"
                      title="Eliminar logotipo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-1">
                  <span>Aspecto: {logoDimensions.width} × {logoDimensions.height} px</span>
                  <span>Almacenamiento: Supabase Base64</span>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-violet-500/50 rounded-lg p-6 bg-slate-900/20 text-center cursor-pointer transition-all hover:bg-slate-800/10 group flex flex-col items-center justify-center min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center mb-2.5 text-slate-500 group-hover:text-violet-400 group-hover:bg-slate-800/80 transition-colors">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">Subir logotipo</p>
                <p className="text-[10px] text-slate-500 mt-1">Soporta PNG, JPG, JPEG o SVG</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            )}
          </div>

          {/* 2. COLOR EXTRACTOR */}
          {logoSrc && extractedColors.length > 0 && (
            <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-violet-400" />
                  Extracción de Colores
                </h4>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900/30 font-semibold uppercase tracking-wider animate-pulse">Canvas Activo</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {extractedColors.map((hex, idx) => {
                  const nameRole = getClosestColorName(hex);
                  const darkRatio = getContrastRatio(hex, '#0F0F11');
                  const lightRatio = getContrastRatio(hex, '#FFFFFF');

                  const passesDark = darkRatio >= 4.5 ? 'Pasa' : darkRatio >= 3.0 ? 'Pasa G' : 'Falla';
                  const passesLight = lightRatio >= 4.5 ? 'Pasa' : lightRatio >= 3.0 ? 'Pasa G' : 'Falla';

                  const rgb = hexToRgb(hex);
                  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
                  const pantone = getClosestPantone(rgb.r, rgb.g, rgb.b);

                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
                      <div>
                        {/* Swatch */}
                        <div 
                          className="h-7 w-full rounded-md shadow-inner border border-slate-950 mb-2 relative group cursor-pointer"
                          style={{ backgroundColor: hex }}
                          onClick={() => copyToClipboard(hex)}
                          title="Copiar código HEX"
                        >
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                            {copiedColor === hex ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Title info */}
                        <p className="text-[10px] font-bold text-white truncate">{nameRole.name}</p>
                        <p className="text-[9px] font-mono text-slate-500 font-semibold">{hex.toUpperCase()}</p>

                        {/* CMYK & Pantone codes */}
                        <div className="mt-1.5 space-y-0.5 text-[8px] font-medium text-slate-400 border-t border-slate-800/40 pt-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-semibold">CMYK:</span>
                            <span className="font-mono text-slate-300">{cmyk.c}% {cmyk.m}% {cmyk.y}% {cmyk.k}%</span>
                          </div>
                          <div className="flex justify-between truncate" title={pantone}>
                            <span className="text-slate-500 font-semibold">Pantone:</span>
                            <span className="font-bold text-violet-400 truncate">{pantone.replace(/ \([^)]+\)/g, '')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Readability WCAG Badges */}
                      <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between gap-1 text-[8px] select-none font-mono">
                        <div className="flex flex-col">
                          <span className="text-slate-500">Cont. Osc:</span>
                          <span className={`font-bold ${passesDark === 'Pasa' ? 'text-emerald-400' : passesDark === 'Pasa G' ? 'text-amber-400' : 'text-red-400'}`}>{passesDark} ({darkRatio.toFixed(1)})</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-slate-500">Cont. Clar:</span>
                          <span className={`font-bold ${passesLight === 'Pasa' ? 'text-emerald-400' : passesLight === 'Pasa G' ? 'text-amber-400' : 'text-red-400'}`}>{passesLight} ({lightRatio.toFixed(1)})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. AUDITOR / ANALYSIS BUTTON */}
          {logoSrc && (
            <div className="border border-slate-800 rounded-lg p-4 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Auditoría Visual del Logotipo</h4>
                  <p className="text-[10px] text-slate-500">Ejecuta un diagnóstico estético y de alineación.</p>
                </div>
                {!analysisReport && !isScanning && (
                  <button 
                    onClick={runAnalysis}
                    className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg shadow transition-all shrink-0 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" />
                    Analizar
                  </button>
                )}
              </div>

              {/* Scanning Animation */}
              {isScanning && (
                <div className="mt-4 relative rounded-lg border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center min-h-[140px] overflow-hidden select-none">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/20 to-transparent w-full h-10 animate-bounce top-0" style={{ animationDuration: '1.8s' }} />
                  <img src={logoSrc} alt="Scanning logo" className="max-h-[80px] object-contain opacity-50 filter blur-[0.5px]" />
                  <p className="text-[10px] text-violet-400 font-bold uppercase tracking-wider mt-4 animate-pulse">Escaneando geometría y píxeles...</p>
                </div>
              )}

              {/* Analysis Report Display */}
              {analysisReport && !isScanning && scannedImage === logoSrc && (
                <div className="mt-4 space-y-3.5 text-xs text-slate-300 animate-fadeIn border-t border-slate-800/80 pt-4">
                  <div>
                    <span className="font-bold text-white block mb-1">1. Geometría y Aspecto ({analysisReport.aspectRatio})</span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">{analysisReport.geometry}</p>
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-1">2. Psicología Cromática (Color Dominante)</span>
                    <p className="text-slate-400 leading-relaxed text-[11px]">{analysisReport.psychology}</p>
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-1">3. Sinfonía y Coherencia de Identidad</span>
                    <p className="text-slate-400 leading-relaxed text-[11px]" dangerouslySetInnerHTML={{ __html: analysisReport.coherence }} />
                  </div>
                  <div className="flex gap-2 bg-slate-900 border border-slate-800/60 p-2.5 rounded-lg text-[10px] leading-relaxed text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    <p>{analysisReport.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Interactive Live Mockups */}
        <div className="lg:col-span-7 border border-slate-800 rounded-lg bg-slate-950/40 overflow-hidden flex flex-col h-full min-h-[580px]">
          
          {/* Header tabs for mockups */}
          <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 select-none">
              <Eye className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-bold text-white">Visualización en Formatos</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setMockupCategory('card')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all ${
                  mockupCategory === 'card' 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <CreditCard className="h-3 w-3" />
                Tarjeta
              </button>
              <button
                onClick={() => setMockupCategory('mobile')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all ${
                  mockupCategory === 'mobile' 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                Móvil
              </button>
              <button
                onClick={() => setMockupCategory('letter')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all ${
                  mockupCategory === 'letter' 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <FileText className="h-3 w-3" />
                Papel
              </button>
              <button
                onClick={() => setMockupCategory('merch')}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all ${
                  mockupCategory === 'merch' 
                    ? 'bg-violet-600 text-white shadow-sm' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Shirt className="h-3 w-3" />
                Merch
              </button>
            </div>
          </div>

          {/* Sandbox content */}
          <div className="flex-1 p-6 flex items-center justify-center bg-slate-950/20 min-h-[480px]">
            
            {!logoSrc ? (
              <div className="text-center p-8 select-none">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-600">
                  <CreditCard className="h-6 w-6" />
                </div>
                <h5 className="text-xs font-bold text-slate-400">Sin logotipo disponible</h5>
                <p className="text-[10px] text-slate-600 max-w-[240px] mt-1 mx-auto">
                  Sube el logotipo de tu marca en el panel izquierdo para verlo aplicado automáticamente en este visor de formatos.
                </p>
              </div>
            ) : (
              <>
                {/* 1. MOCKUP: BUSINESS CARD (3D Flippable) */}
                {mockupCategory === 'card' && (
                  <div className="flex flex-col items-center gap-6 select-none">
                    <p className="text-[10px] text-slate-500 font-medium">Haz clic en la tarjeta para voltearla (giro 3D)</p>
                    <div 
                      style={cardStyle} 
                      className="w-[340px] h-[200px] cursor-pointer"
                      onClick={() => setCardFlipped(!cardFlipped)}
                    >
                      <div style={cardInnerStyle} className="w-full h-full">
                        {/* CARD FRONT */}
                        <div 
                          style={{
                            ...cardFaceStyle,
                            backgroundColor: primaryColor,
                            color: '#FFFFFF'
                          }} 
                          className="rounded-2xl border border-white/10 shadow-2xl flex flex-col justify-between p-6 overflow-hidden"
                        >
                          {/* Design elements */}
                          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                          <div className="absolute left-10 bottom-0 w-24 h-12 rounded-t-full" style={{ backgroundColor: secondaryColor, opacity: 0.2 }} />
                          
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-bold tracking-widest uppercase opacity-85">iARTESANA Corporativa</span>
                            <span className="w-2.5 h-2.5 rounded-full bg-white/40" />
                          </div>
                          
                          {/* Center logo */}
                          <div className="my-auto flex justify-center">
                            <img 
                              src={logoSrc} 
                              alt="Card Front Logo" 
                              className="max-h-[50px] max-w-[220px] object-contain brightness-0 invert" 
                            />
                          </div>

                          <div className="flex justify-between items-end text-[8px] tracking-wider opacity-60 font-mono">
                            <span>SISTEMA BASE</span>
                            <span>{activeBrand?.name.toUpperCase()}</span>
                          </div>
                        </div>

                        {/* CARD BACK */}
                        <div 
                          style={{
                            ...cardBackFaceStyle,
                            backgroundColor: '#0f0f12',
                            color: '#ECECEF'
                          }} 
                          className="rounded-2xl border border-slate-800 shadow-2xl flex flex-col justify-between p-6 overflow-hidden text-left"
                        >
                          <div className="absolute left-0 top-0 w-24 h-24 rounded-full blur-2xl opacity-10" style={{ backgroundColor: primaryColor }} />
                          
                          <div className="flex justify-between items-start">
                            {/* Personal information */}
                            <div>
                              <p className="text-xs font-black text-white">{user?.name || 'Gerard iARTESANA'}</p>
                              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: accentColor }}>
                                {user?.role === 'admin' ? 'Director Creativo' : 'Consultor de Marca'}
                              </p>
                            </div>
                            {/* Tiny Logo */}
                            <img 
                              src={logoSrc} 
                              alt="Card Back Logo" 
                              className="max-h-[28px] max-w-[100px] object-contain" 
                              style={{ filter: `drop-shadow(0px 1px 2px rgba(0,0,0,0.4))` }}
                            />
                          </div>

                          {/* Contact Details */}
                          <div className="space-y-1.5 font-mono text-[8px] text-slate-400 border-t border-slate-900 pt-3">
                            <p className="flex items-center gap-1.5">
                              <span className="text-slate-600 font-bold">M:</span>
                              <span>{user?.email || 'hola@iartesana.es'}</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span className="text-slate-600 font-bold">T:</span>
                              <span>+34 900 123 456</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span className="text-slate-600 font-bold">W:</span>
                              <span className="font-semibold text-slate-300">iartesana.es/{activeBrand?.slug}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MOCKUP: MOBILE APP SCREEN */}
                {mockupCategory === 'mobile' && (
                  <div className="flex flex-col items-center gap-4 select-none">
                    {/* Switcher inside phone */}
                    <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 mb-2">
                      <button 
                        onClick={() => setMobileTab('splash')}
                        className={`text-[9px] font-bold px-3 py-1 rounded ${mobileTab === 'splash' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        Splash Screen
                      </button>
                      <button 
                        onClick={() => setMobileTab('home')}
                        className={`text-[9px] font-bold px-3 py-1 rounded ${mobileTab === 'home' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      >
                        App Interface
                      </button>
                    </div>

                    {/* Smartphone Bezel */}
                    <div className="w-[220px] h-[400px] rounded-[36px] border-[6px] border-slate-800 bg-[#0c0c0e] shadow-2xl relative overflow-hidden flex flex-col">
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-b-xl z-20 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      </div>

                      {/* Screen Content */}
                      <div className="flex-1 flex flex-col overflow-hidden relative">
                        
                        {/* TAB A: SPLASH SCREEN */}
                        {mobileTab === 'splash' && (
                          <div 
                            className="flex-1 flex flex-col items-center justify-center p-4"
                            style={{ 
                              background: `radial-gradient(circle at center, #1b1921 0%, #0c0c0e 100%)`
                            }}
                          >
                            {/* Logo with pulsing glow */}
                            <div className="relative flex items-center justify-center p-4">
                              <div className="absolute inset-0 rounded-full blur-xl animate-pulse opacity-40" style={{ backgroundColor: primaryColor }} />
                              <img src={logoSrc} alt="Phone Splash Logo" className="max-h-[50px] max-w-[150px] object-contain relative z-10" />
                            </div>
                            
                            {/* Bottom loader */}
                            <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2">
                              <div className="h-0.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 w-1/2 rounded-full animate-infinite" style={{ animation: 'shimmer 1.5s infinite linear' }} />
                              </div>
                              <span className="text-[7px] font-mono tracking-widest text-slate-500 uppercase">Cargando...</span>
                            </div>
                          </div>
                        )}

                        {/* TAB B: APP DASHBOARD */}
                        {mobileTab === 'home' && (
                          <div className="flex-1 flex flex-col bg-slate-950 text-slate-200">
                            {/* Nav bar */}
                            <div className="h-10 border-b border-slate-900 bg-slate-900/60 px-3 flex items-center justify-between pt-3">
                              <span className="text-[7px] font-bold text-slate-400">Menú</span>
                              <img src={logoSrc} alt="Phone Nav Logo" className="max-h-[14px] max-w-[65px] object-contain" />
                              <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[7px] font-bold">U</span>
                            </div>
                            
                            {/* Scrollable feed */}
                            <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
                              {/* Welcome banner */}
                              <div 
                                className="rounded-lg p-2.5 text-white relative overflow-hidden"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <p className="text-[7px] font-mono tracking-widest uppercase opacity-75">Workspace</p>
                                <p className="text-[9px] font-bold mt-0.5">Bienvenido a {activeBrand?.name}</p>
                                <div className="absolute -right-4 -bottom-4 w-12 h-12 rounded-full bg-white/10 blur-md" />
                              </div>

                              {/* Quick Stats Grid */}
                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="bg-slate-900/80 border border-slate-900 rounded-lg p-2 text-left">
                                  <span className="text-[6px] font-bold text-slate-500 uppercase">PROYECTOS</span>
                                  <p className="text-[10px] font-bold text-white mt-0.5">14 Activos</p>
                                </div>
                                <div className="bg-slate-900/80 border border-slate-900 rounded-lg p-2 text-left">
                                  <span className="text-[6px] font-bold text-slate-500 uppercase">Alineación</span>
                                  <p className="text-[10px] font-bold text-emerald-400 mt-0.5">95% Óptima</p>
                                </div>
                              </div>

                              {/* Sample list item styled with accent */}
                              <div className="bg-slate-900/40 border border-slate-900 rounded-lg p-2 flex items-center justify-between text-[8px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                                  <span className="font-semibold text-slate-300">Identidad Digital</span>
                                </div>
                                <span className="text-[7px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">10:45</span>
                              </div>

                              {/* Button styled with secondary */}
                              <button 
                                className="w-full rounded-md text-[8px] font-bold py-1.5 text-center text-white transition-colors"
                                style={{ backgroundColor: secondaryColor }}
                              >
                                Acciones Rápidas
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Home indicator bar */}
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-slate-700 rounded-full z-20" />
                    </div>
                  </div>
                )}

                {/* 3. MOCKUP: LETTERHEAD / DOCUMENT SHEET */}
                {mockupCategory === 'letter' && (
                  <div className="w-[320px] h-[420px] bg-white rounded-lg border border-slate-200 shadow-2xl p-6 text-left text-slate-800 relative flex flex-col justify-between overflow-hidden select-none">
                    {/* Color stripe top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }} />

                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <img src={logoSrc} alt="Doc Logo" className="max-h-[32px] max-w-[120px] object-contain" />
                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider mt-1">{activeBrand?.name} S.L.</p>
                      </div>
                      <div className="text-right text-[6px] text-slate-400 font-mono">
                        <p>Factura: #ES-2026-0042</p>
                        <p>Fecha: 11 de Junio, 2026</p>
                        <p>Cliente: iARTESANA LABS</p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-b border-slate-100 my-4" />

                    {/* Body text */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h6 className="text-[9px] font-extrabold text-slate-800 uppercase tracking-wide">Concepto de Asesoría de Marca</h6>
                        <p className="text-[8px] text-slate-500 leading-relaxed mt-1">
                          Servicios profesionales de conceptualización de identidad verbal, glosario nativo, análisis de arquetipos y gobierno de sistemas para agentes de IA.
                        </p>
                      </div>

                      {/* Small table */}
                      <div className="border border-slate-100 rounded overflow-hidden">
                        <table className="w-full text-[7px] leading-normal">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                              <th className="p-1 text-left">Descripción</th>
                              <th className="p-1 text-right">Horas</th>
                              <th className="p-1 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600">
                            <tr>
                              <td className="p-1">Definición de Rueda de Arquetipos</td>
                              <td className="p-1 text-right">12h</td>
                              <td className="p-1 text-right">960€</td>
                            </tr>
                            <tr>
                              <td className="p-1">Auditoría Visual de Conceptualización</td>
                              <td className="p-1 text-right">8h</td>
                              <td className="p-1 text-right">640€</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Total */}
                      <div className="flex justify-end pr-1 text-[8px] font-bold text-slate-700">
                        <div className="text-right space-y-0.5">
                          <p className="text-slate-400 text-[7px] font-normal">Base Imponible: 1.600€</p>
                          <p style={{ color: primaryColor }}>Importe Total: 1.936€ (IVA Inc.)</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer decoration */}
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[5.5px] text-slate-400 font-mono">
                      <span>C/ Gran Vía, 45, Planta 4, Madrid</span>
                      <span className="font-bold" style={{ color: secondaryColor }}>{activeBrand?.slug}.iartesana.es</span>
                    </div>
                  </div>
                )}

                {/* 4. MOCKUP: MERCHANDISING (TOTE BAG & SHIRT) */}
                {mockupCategory === 'merch' && (
                  <div className="grid grid-cols-2 gap-6 select-none">
                    
                    {/* Tote bag */}
                    <div className="flex flex-col items-center">
                      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 w-[130px] h-[150px] flex items-center justify-center overflow-hidden">
                        
                        {/* Tote Bag SVG Graphic */}
                        <svg viewBox="0 0 100 120" className="w-[100px] h-[120px] text-slate-200 fill-slate-200 opacity-90 relative">
                          {/* Strap */}
                          <path d="M30 40 C 30 10, 70 10, 70 40" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-400" />
                          {/* Bag body */}
                          <path d="M20 40 L80 40 L85 110 L15 110 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" />
                          {/* Shading/Depth overlay */}
                          <path d="M20 40 L50 40 L45 110 L15 110 Z" fill="black" fillOpacity="0.05" />
                        </svg>

                        {/* Overlay Logo */}
                        <div className="absolute top-[65px] left-1/2 -translate-x-1/2 w-[55px] h-[30px] flex items-center justify-center mix-blend-multiply opacity-80 pointer-events-none">
                          <img src={logoSrc} alt="Merch Tote Logo" className="max-h-[22px] object-contain grayscale brightness-0 contrast-200" />
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold mt-2.5">Bolsa de Algodón</span>
                    </div>

                    {/* T-Shirt */}
                    <div className="flex flex-col items-center">
                      <div className="relative bg-slate-900 border border-slate-800 rounded-xl p-4 w-[130px] h-[150px] flex items-center justify-center overflow-hidden">
                        
                        {/* T-Shirt SVG Graphic */}
                        <svg viewBox="0 0 100 100" className="w-[100px] h-[100px] text-slate-200 fill-slate-200 opacity-90 relative">
                          <path d="M20 15 L35 5 L50 15 L65 5 L80 15 L88 40 L76 45 L73 30 L73 95 L27 95 L27 30 L24 45 L12 40 Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M20 15 L35 5 L50 15 L50 95 L27 95 L27 30 L24 45 L12 40 Z" fill="black" fillOpacity="0.05" />
                        </svg>

                        {/* Overlay Logo */}
                        <div className="absolute top-[48px] left-1/2 -translate-x-1/2 w-[45px] h-[25px] flex items-center justify-center mix-blend-multiply opacity-80 pointer-events-none">
                          <img src={logoSrc} alt="Merch Shirt Logo" className="max-h-[16px] object-contain grayscale brightness-0 contrast-200" />
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold mt-2.5">Camiseta de Marca</span>
                    </div>

                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
