"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * GsapSafety — guarantees content is never stuck invisible.
 *
 * Responsibilities:
 *  1. Refresh ScrollTrigger after window load (fonts/layout shifts can
 *     otherwise leave trigger positions stale).
 *  2. Safety net: after a short delay, force-reveal any animated element
 *     that is currently within the viewport but still at opacity 0 (the
 *     "stuck" case). Below-the-fold elements are left alone so scroll
 *     reveals keep working for real users.
 *
 * This makes the interface robust to: slow JS, font reflow, anchor-link
 * loads, and full-page captures — without degrading the scroll reveal
 * experience for users who browse normally.
 */
export function GsapSafety() {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    // Initial refresh after a tick (covers cases where load already fired)
    const t1 = window.setTimeout(refresh, 300);

    // Safety net: reveal stuck in-viewport animated elements
    const REVEAL_SEL =
      "[data-hero],[data-cat],[data-how],[data-ia],[data-sp],[data-ss]";
    const revealStuck = () => {
      if (prefersReduced) return;
      const vh = window.innerHeight;
      const vy = window.scrollY;
      const els = document.querySelectorAll<HTMLElement>(REVEAL_SEL);
      els.forEach((el) => {
        const op = parseFloat(getComputedStyle(el).opacity);
        if (op !== 0) return;
        const r = el.getBoundingClientRect();
        // within current viewport + 25% buffer
        const inView = r.top < vh * 1.25 && r.bottom > -vh * 0.25;
        if (inView) {
          gsap.killTweensOf(el);
          gsap.set(el, { opacity: 1, x: 0, y: 0, clearProps: "transform,opacity" });
        }
      });
    };
    const t2 = window.setTimeout(revealStuck, 1800);

    return () => {
      window.removeEventListener("load", refresh);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}
