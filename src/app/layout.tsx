import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { BrandProvider } from "@/lib/contexts/brand-context";

export const metadata: Metadata = {
  title: "iARTESANA — Sistema Base",
  description: "Núcleo de Contexto vivo para marcas. Transforma manuales de identidad en documentos estructurados y exportables para agentes de IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" style={{ colorScheme: 'dark' }}>
      <body className="antialiased font-sans">
        <AuthProvider>
          <BrandProvider>
            {children}
          </BrandProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
