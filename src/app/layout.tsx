import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { COMPANY } from "@/lib/company";
import { ErrorBoundary } from "@/components/docfacil/error-boundary";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${COMPANY.productName} — Documentos legais prontos como numa conversa`,
  description:
    "Sem burocracia, sem juridiquês. Responda perguntas simples e veja seu documento ganhar forma. Modelos revisados com base em prática cartorial real.",
  applicationName: COMPANY.productName,
  keywords: [
    COMPANY.productName,
    "documentos legais",
    "contratos",
    "declarações",
    "procuração",
    "documento online",
    COMPANY.shortName,
  ],
  authors: [{ name: COMPANY.name, url: COMPANY.url }],
  creator: COMPANY.name,
  publisher: COMPANY.name,
  copyright: `© ${COMPANY.copyrightRange()} ${COMPANY.name}`,
  icons: {
    icon: "/logo.svg",
  },
  metadataBase: new URL(COMPANY.url),
  openGraph: {
    title: `${COMPANY.productName} — Documentos legais prontos como numa conversa`,
    description:
      "Sem burocracia, sem juridiquês. Responda perguntas simples e veja seu documento ganhar forma.",
    siteName: COMPANY.productName,
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY.productName} — Documentos legais prontos como numa conversa`,
    description:
      "Sem burocracia, sem juridiquês. Responda perguntas simples e veja seu documento ganhar forma.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${inter.variable} antialiased bg-paper text-ink`}
      >
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 pointer-events-none"
          style={{
            backgroundColor: "var(--paper)",
            backgroundImage:
              "radial-gradient(circle at 12% 18%, rgba(20, 49, 92, 0.025) 0, transparent 38%), radial-gradient(circle at 88% 72%, rgba(62, 142, 110, 0.022) 0, transparent 42%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.035'/%3E%3C/feComponentTransfer%3E%3CfeComposite operator='over' in2='SourceGraphic'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
        <SonnerToaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
