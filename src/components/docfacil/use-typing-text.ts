"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useTypingText — anima texto aparecendo aos poucos (efeito digitação).
 * Respeita prefers-reduced-motion (mostra completo imediato).
 */
export function useTypingText(
  fullText: string,
  speed = 25,
  deps: unknown[] = []
) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText("");
    setDone(false);
    if (typeof window === "undefined") { setText(fullText); setDone(true); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setText(fullText); setDone(true); return; }
    let i = 0;
    const tick = () => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
        timer.current = setTimeout(tick, speed);
      } else { setDone(true); }
    };
    tick();
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [fullText, speed]);

  return { text, done };
}
