"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Confetti — 40 confetes coloridos que caem do topo da tela.
 * CSS animations (não GSAP). Dura ~3s. Respeita prefers-reduced-motion.
 */
const CORES = ["#2554C7", "#3E8E6E", "#FF6A4D", "#E7EEFC", "#14315C"];

export function Confetti({ duration = 3000 }: { duration?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVisivel(false); return; }
    const t = setTimeout(() => setVisivel(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!visivel) return null;

  const confetes = Array.from({ length: 40 }, (_, i) => ({
    i, left: Math.random() * 100, delay: Math.random() * 0.5,
    dur: 2 + Math.random() * 1.5, cor: CORES[i % CORES.length],
    tamanho: 6 + Math.random() * 8, rotacao: Math.random() * 360,
  }));

  return (
    <div ref={container} className="fixed inset-0 pointer-events-none z-[100]" aria-hidden="true">
      {confetes.map((c) => (
        <div key={c.i} className="absolute top-0" style={{
          left: `${c.left}%`, width: c.tamanho, height: c.tamanho,
          backgroundColor: c.cor, borderRadius: c.i % 2 === 0 ? "50%" : "2px",
          transform: `rotate(${c.rotacao}deg)`, animation: `confettiFall ${c.dur}s ease-in ${c.delay}s forwards`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
