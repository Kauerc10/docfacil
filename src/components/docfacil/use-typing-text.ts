"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useTypingText — anima texto aparecendo aos poucos (efeito digitação).
 * Respeita prefers-reduced-motion (mostra completo imediato).
 *
 * Retorna `skip()` para revelar o texto completo instantaneamente
 * (ex.: quando o usuário clica no balão do pet).
 */
export function useTypingText(
  fullText: string,
  speed = 25,
  deps: unknown[] = []
) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const skip = useCallback(() => {
    clearTimer();
    setText(fullText);
    setDone(true);
  }, [fullText, clearTimer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText("");
    setDone(false);
    clearTimer();
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
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullText, speed, clearTimer, ...deps]);

  return { text, done, skip };
}
