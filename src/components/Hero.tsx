"use client";

import { useEffect, useRef } from "react";
import WebGLSlab from "./WebGLSlab";
import VoidField from "./VoidField";

/* ─────────────────────────────────────────────────────────────────
   Entrance animation — staggered fade + translate
   ───────────────────────────────────────────────────────────────── */

const ENTRANCE_ELEMENTS = [
  ".brand",
  ".meta",
  ".eyebrow",
  ".title",
  ".subtitle",
  ".cta-row",
] as const;

const ENTRANCE_DELAYS: Record<string, number> = {
  ".brand": 0.1,
  ".meta": 0.18,
  ".eyebrow": 0.3,
  ".title": 0.42,
  ".subtitle": 0.62,
  ".cta-row": 0.82,
};

/* ─────────────────────────────────────────────────────────────────
   Parallax calibration — requestAnimationFrame + lerp
   ─────────────────────────────────────────────────────────────────
   Background   (depth-0): 0.8px / 0.6px  — low amplitude
   WebGL slab   (depth-3): scroll-driven   — medium amplitude + counter-rotate
   Title        (depth-4): -0.3px / -0.2px — extremely subtle counter
   Eyebrow / Subtitle / CTA: ZERO parallax
   ───────────────────────────────────────────────────────────────── */

const BG_TX = 0.8;
const BG_TY = 0.6;

const TITLE_TX = -0.3;
const TITLE_TY = -0.2;

/* Scroll → slab position/rotation mapping */
const SLAB_SCROLL_LERP = 0.06; // smooth arrival
const SLAB_MAX_Y = 55;          // px — slab drops 55px over full viewport scroll
const SLAB_COUNTER_ROTATE_X = 0.025; // rotateX counter-tilt on scroll
const SLAB_COUNTER_ROTATE_Y = 0.015; // rotateY counter-tilt on scroll

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function Hero() {
  /* ── Refs ─────────────────────────────────────────────── */
  const bgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const slabRef = useRef<HTMLDivElement>(null);   // DOM container of WebGLSlab

  // Scroll state
  const scrollYRef = useRef(0);
  const scrollLerpedRef = useRef(0);

  // Mouse parallax state (background + title)
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  // rAF handle
  const rafRef = useRef<number>(0);

  /* ── Entrance animation ──────────────────────────────── */
  const hasRun = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || hasRun.current) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    hasRun.current = true;

    if (prefersReduced) {
      ENTRANCE_ELEMENTS.forEach((selector) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
      return;
    }

    ENTRANCE_ELEMENTS.forEach((selector) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      const delay = ENTRANCE_DELAYS[selector] ?? 0;
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition =
        "opacity 0.9s cubic-bezier(0.28, 0.72, 0.18, 1), transform 0.9s cubic-bezier(0.28, 0.72, 0.18, 1)";
      el.style.transitionDelay = `${delay}s`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      });
    });
  }, []);

  /* ── Unified rAF parallax loop ─────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    /* Mouse tracking */
    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      mouseRef.current.y = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
    };
    const onLeave = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    /* Scroll tracking */
    const onScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    /* RAF loop — all parallax driven here, one place */
    const tick = () => {
      /* Mouse lerp */
      const t = 0.055;
      currentRef.current.x = lerp(currentRef.current.x, mouseRef.current.x, t);
      currentRef.current.y = lerp(currentRef.current.y, mouseRef.current.y, t);
      const mx = currentRef.current.x;
      const my = currentRef.current.y;

      /* Scroll lerp */
      scrollLerpedRef.current = lerp(
        scrollLerpedRef.current,
        scrollYRef.current,
        SLAB_SCROLL_LERP
      );
      const sy = scrollLerpedRef.current;

      /* Background parallax */
      if (bgRef.current) {
        bgRef.current.style.transform = `translate3d(${mx * BG_TX}px, ${my * BG_TY}px, 0)`;
      }

      /* Title extremely subtle counter-parallax */
      if (titleRef.current) {
        titleRef.current.style.transform = `translate3d(${mx * TITLE_TX}px, ${my * TITLE_TY}px, 0)`;
      }

      /* WebGL slab — scroll-driven Y + counter-rotate
         Applied via the container ref; pointer tilt lives inside WebGLSlab */
      if (slabRef.current) {
        /* Normalized scroll: 0 at top, 1 at one viewport scroll */
        const norm = sy / Math.max(window.innerHeight, 1);
        const slabY = norm * SLAB_MAX_Y;
        /* Counter-rotateX: slab tilts backward as user scrolls down */
        const rotX = -norm * SLAB_COUNTER_ROTATE_X;
        /* Counter-rotateY: slight yaw opposite to mouse x */
        const rotY = mx * 0.008 - norm * SLAB_COUNTER_ROTATE_Y;

        slabRef.current.style.transform = `translate3d(0px, ${slabY}px, 0px) rotateX(${rotX}rad) rotateY(${rotY}rad)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <main
      id="hero"
      aria-label="Spatial interfaces for agentic systems"
      className="relative min-h-[100dvh] overflow-hidden"
      style={{
        perspective: "1600px",
        perspectiveOrigin: "50% 36%",
        isolation: "isolate",
      }}
    >
      {/* ── Deep space background ──────────────────────── */}
      <div
        ref={bgRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, #0F1219 0%, #080A10 100%)",
        }}
      />

      {/* ── Subtle depth grid ──────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 grid-overlay" />

      {/* ── Atmospheric radial glow ────────────────────── */}
      <div
        className="absolute pointer-events-none z-[4]"
        style={{
          top: "0",
          left: "50%",
          transform: "translateX(-50%)",
          width: "70vw",
          height: "80vh",
          background:
            "radial-gradient(ellipse 50% 40% at 50% 48%, rgba(40, 100, 180, 0.07) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* ── Void particle field ─────────────────────────── */}
      <VoidField />

      {/* ── Brand (top-left) — fixed, zero parallax ───── */}
      <header
        className="brand absolute z-10 select-none"
        style={{
          top: "30px",
          left: "36px",
          fontSize: "10px",
          letterSpacing: "0.38em",
          textTransform: "uppercase",
          color: "rgba(237, 233, 227, 0.58)",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        }}
      >
        <span
          className="inline-block"
          style={{
            width: "6px",
            height: "6px",
            border: "1px solid rgba(237, 233, 227, 0.58)",
            transform: "rotate(45deg)",
            position: "relative",
          }}
        >
          <span
            className="absolute inset-[2px]"
            style={{ background: "rgba(237, 233, 227, 0.5)" }}
          />
        </span>
        <span
          className="ml-[10px]"
          style={{ color: "#EDE9E3", fontStyle: "normal" }}
        >
          Spatial
        </span>
      </header>

      {/* ── Meta (top-right) — fixed, zero parallax ────── */}
      <div
        className="meta absolute z-10 select-none"
        aria-hidden="true"
        style={{
          top: "30px",
          right: "36px",
          fontSize: "9.5px",
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: "rgba(237, 233, 227, 0.32)",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span>Q3 / 26</span>
        <span
          style={{
            width: "1px",
            height: "12px",
            background: "rgba(237, 233, 227, 0.2)",
            display: "inline-block",
          }}
        />
        <span>11° 04′ N</span>
      </div>

      {/* ── WebGL architectural slab — scroll parallax + pointer tilt */}
      {/* z-index 5, behind copy (z-20) */}
      <div ref={slabRef} className="absolute inset-0 z-[5]">
        <WebGLSlab />
      </div>

      {/* ── Editorial copy — NO parallax on any text layer ─── */}
      <section
        className="hero-copy absolute left-1/2 z-20 text-center"
        style={{
          top: "15vh",
          transform: "translateX(-50%)",
          maxWidth: "640px",
          width: "100%",
          padding: "0 40px",
        }}
      >
        {/* Eyebrow — ZERO parallax */}
        <p
          className="eyebrow mb-6 inline-flex items-center"
          style={{
            gap: "16px",
            fontSize: "10px",
            letterSpacing: "0.36em",
            textTransform: "uppercase",
            color: "rgba(237, 233, 227, 0.58)",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            transformStyle: "preserve-3d",
          }}
        >
          <span
            style={{
              width: "28px",
              height: "1px",
              background: "rgba(237, 233, 227, 0.22)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span>Agentic Infrastructure</span>
        </p>

        {/* Title — extremely subtle counter-parallax */}
        <h1
          ref={titleRef}
          className="title mb-5"
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            lineHeight: 1.12,
            letterSpacing: "-0.015em",
            fontFamily: "Georgia, serif",
            fontWeight: 400,
            color: "#EDE9E3",
            transformStyle: "preserve-3d",
          }}
        >
          Spatial interfaces
          <br />
          <em>for agentic systems.</em>
        </h1>

        {/* Subtitle — ZERO parallax */}
        <p
          className="subtitle mb-8"
          style={{
            fontSize: "15px",
            lineHeight: 1.65,
            letterSpacing: "0.01em",
            color: "rgba(237, 233, 227, 0.52)",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            transformStyle: "preserve-3d",
          }}
        >
          A quiet control plane for observing, composing,
          <br />
          and scaling AI workflows.
        </p>

        {/* CTA — pure CSS hover/active, ZERO parallax */}
        <div className="cta-row">
          <a
            href="#"
            className="cta-link group inline-flex items-center gap-3"
          >
            <span className="cta-label">Enter preview</span>
            <span className="cta-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </section>

      {/* ── Noscript fallback ──────────────────────────── */}
      <noscript>
        <p
          style={{
            color: "#EDE9E3",
            padding: "1rem",
            textAlign: "center",
            font: "14px/1.6 Georgia, serif",
            fontStyle: "italic",
            position: "absolute",
            bottom: "40%",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          The visual is fully present without JavaScript; scripting only adds
          pointer parallax and a restrained entrance animation.
        </p>
      </noscript>
    </main>
  );
}
