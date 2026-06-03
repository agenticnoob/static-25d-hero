"use client";

import { useEffect, useRef } from "react";
import WebGLSlab from "./WebGLSlab";

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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function Hero() {
  // Refs for parallax layers
  const bgRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Stable layer list
  const layersRef = useRef<
    Array<{ el: HTMLElement; tx: number; ty: number }>
  >([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  // ── Entrance animation ────────────────────────────────────
  const hasRun = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || hasRun.current) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      hasRun.current = true;
      ENTRANCE_ELEMENTS.forEach((selector) => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) return;
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
      return;
    }
    hasRun.current = true;

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

  // ── Shared rAF parallax loop for all text layers + background ─
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = clamp(
        (e.clientX / window.innerWidth) * 2 - 1,
        -1,
        1
      );
      mouseRef.current.y = clamp(
        (e.clientY / window.innerHeight) * 2 - 1,
        -1,
        1
      );
    };

    const onLeave = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    const t = 0.055; // Global lerp damping

    const tick = () => {
      currentRef.current.x = lerp(currentRef.current.x, mouseRef.current.x, t);
      currentRef.current.y = lerp(currentRef.current.y, mouseRef.current.y, t);

      const mx = currentRef.current.x;
      const my = currentRef.current.y;

      // Update all registered layers imperatively
      layersRef.current.forEach((layer) => {
        layer.el.style.transform = `translate3d(${mx * layer.tx}px, ${my * layer.ty}px, 0)`;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  // ── Register layers after mount ────────────────────────────
  useEffect(() => {
    const layers: typeof layersRef.current = [];

    if (bgRef.current) {
      // Background: moderate amplitude (2px at peak)
      layers.push({ el: bgRef.current, tx: 2.0, ty: 1.5 });
    }
    if (eyebrowRef.current) {
      // Eyebrow: subtle counter-movement (-0.8px peak)
      layers.push({ el: eyebrowRef.current, tx: -0.8, ty: -0.5 });
    }
    if (subtitleRef.current) {
      // Subtitle: same direction as eyebrow
      layers.push({ el: subtitleRef.current, tx: -0.8, ty: -0.5 });
    }
    if (titleRef.current) {
      // Title: slight counter-movement (-1.2px peak)
      layers.push({ el: titleRef.current, tx: -1.2, ty: -0.8 });
    }

    layersRef.current = layers;

    return () => {
      layersRef.current = [];
    };
  }, []);

  return (
    <main
      id="hero"
      aria-label="Spatial interfaces for agentic systems"
      className="fixed inset-0 overflow-hidden"
      style={{
        perspective: "1600px",
        perspectiveOrigin: "50% 42%",
        isolation: "isolate",
      }}
    >
      {/* ── Deep space background ─────────────────────────── */}
      <div
        ref={bgRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, #0F1219 0%, #080A10 100%)" }}
      />

      {/* ── Subtle depth grid ────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0 grid-overlay" />

      {/* ── Brand (top-left) — fixed, NO parallax ───────── */}
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

      {/* ── Meta (top-right) — fixed, NO parallax ───────── */}
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

      {/* ── WebGL architectural slab ─────────────────────── */}
      <WebGLSlab />

      {/* ── Editorial copy ──────────────────────────────── */}
      <section
        className="hero-copy absolute left-1/2 z-20 text-center"
        style={{
          top: "12vh",
          transform: "translateX(-50%)",
          maxWidth: "640px",
          width: "100%",
          padding: "0 40px",
        }}
      >
        {/* Eyebrow */}
        <p
          ref={eyebrowRef}
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

        {/* Title */}
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

        {/* Subtitle */}
        <p
          ref={subtitleRef}
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

        {/* CTA — NO parallax, only hover micro-interaction */}
        <div className="cta-row">
          <a
            href="#"
            className="inline-flex items-center gap-3"
            style={{
              padding: "13px 22px 13px 24px",
              border: "1px solid rgba(237, 233, 227, 0.18)",
              fontSize: "10.5px",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "rgba(237, 233, 227, 0.65)",
              fontFamily: "Georgia, serif",
              textDecoration: "none",
              transition:
                "color 0.35s cubic-bezier(0.28, 0.72, 0.18, 1), border-color 0.35s cubic-bezier(0.28, 0.72, 0.18, 1)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "#EDE9E3";
              el.style.borderColor = "rgba(237, 233, 227, 0.45)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.color = "rgba(237, 233, 227, 0.65)";
              el.style.borderColor = "rgba(237, 233, 227, 0.18)";
            }}
          >
            <span>Enter preview</span>
            <span
              aria-hidden="true"
              style={{
                transition: "transform 0.35s cubic-bezier(0.28, 0.72, 0.18, 1)",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                (
                  e.currentTarget as HTMLElement
                ).style.transform = "translateX(4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform =
                  "translateX(0)";
              }}
            >
              →
            </span>
          </a>
        </div>
      </section>

      {/* ── Noscript fallback ───────────────────────────── */}
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
