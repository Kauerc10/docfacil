"use client";

import { Component, type ReactNode } from "react";
import { logger } from "@/lib/logger";

/**
 * ErrorBoundary — captura erros de renderização do React e mostra
 * uma fallback UI amigável em vez de tela branca/crash.
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}
interface ErrorBoundaryState { error: Error | null; }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  componentDidCatch(error: Error, info: { componentStack: string }): void {
    logger.error("ErrorBoundary", "erro de renderização capturado", error, { componentStack: info.componentStack });
  }
  reset = (): void => { this.setState({ error: null }); };
  render(): ReactNode {
    if (this.state.error) {
      if (typeof this.props.fallback === "function") return this.props.fallback(this.state.error, this.reset);
      if (this.props.fallback) return this.props.fallback;
      return <DefaultFallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, reset }: { error: Error; reset: () => void }): ReactNode {
  return (
    <div className="min-h-screen grid place-items-center bg-paper p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--coral)]/10 grid place-items-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--coral)]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-jakarta)] text-2xl font-bold text-ink mb-2">Algo deu errado</h1>
        <p className="text-ink/60 mb-6">Ocorreu um erro inesperado. Tente novamente — se persistir, chame a gente no WhatsApp.</p>
        {process.env.NODE_ENV === "development" && (
          <pre className="text-xs text-left bg-surface border border-[var(--border)] rounded-lg p-3 mb-4 overflow-auto max-h-32 text-[var(--coral)]">{error.message}</pre>
        )}
        <button onClick={reset} className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-[var(--blue-royal)] text-white font-semibold hover:bg-[#1e44a8] transition-colors">Tentar novamente</button>
      </div>
    </div>
  );
}
