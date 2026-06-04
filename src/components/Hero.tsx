"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { homepageSections } from "@/content/homepage";
import { getScrollStage, getStageIndex } from "@/lib/interaction";
import WebGLSlab from "./WebGLSlab";
import NarrativeSection from "./NarrativeSection";

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
   Parallax calibration
   ─────────────────────────────────────────────────────────────────
   Desktop:
     Background  : 0.8px / 0.6px  — low amplitude, mouse-driven
     WebGL slab  : R3F scroll parallax (sceneStateRef.slabDropPx)
                   + physics rotation via physRef (also mouse-driven)
     Title       : -0.3px / -0.2px — subtle counter-parallax, mouse-driven
     Eyebrow / Subtitle / CTA: ZERO parallax (text must stay legible)
   Mobile:
     Background  : 0.3px / 0.2px  — reduced
     Title        : 0 (disabled on touch)
   ───────────────────────────────────────────────────────────────── */

const TITLE_TX   = -0.3;
const TITLE_TY   = -0.2;

/* Scroll → slab CSS parallax */
const SLAB_SCROLL_LERP   = 0.06;
const SLAB_MAX_Y_DESKTOP = 72;
const SLAB_MAX_Y_TOUCH   = 54;

/* Mouse → WebGL physics (physRef) */
const PHYS_SPRING  = 0.045;
const PHYS_DAMPING = 0.82;
const PHYS_REST_Y  = 0.18;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function scheduleFrame(callback: FrameRequestCallback): number {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(() => callback(Date.now()), 16);
}

function cancelFrame(id: number) {
  if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
    window.cancelAnimationFrame(id);
    return;
  }

  window.clearTimeout(id);
}

/* ─────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────── */

export default function Hero() {
  /* ── Refs ─────────────────────────────────────────────── */
  const titleRef  = useRef<HTMLHeadingElement>(null);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const slabPhysRef = useRef<{
    pos:    THREE.Vector2;
    vel:    THREE.Vector2;
    target: THREE.Vector2;
    active: boolean;
  }>({
    pos:    new THREE.Vector2(0, PHYS_REST_Y),
    vel:    new THREE.Vector2(0, 0),
    target: new THREE.Vector2(0, PHYS_REST_Y),
    active: false,
  });

  const scrollYRef     = useRef(0);
  const scrollLerpedRef = useRef(0);
  const scrollProgressRef = useRef(0);
  const scrollStageRef = useRef(getScrollStage(0));
  const sceneStateRef = useRef({
    scrollProgress: 0,
    stageIndex: 0,
    stageProgress: 0,
    slabDropPx: 0,
  });

  const mouseRef   = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  const rafRef = useRef<number>(0);

  const isTouchDevice = useRef(false);

  /* ── Entrance animation ──────────────────────────────── */
  const hasRun = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || hasRun.current) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hasRun.current = true;

    isTouchDevice.current =
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      "ontouchstart" in window;

    if (
      prefersReduced ||
      isTouchDevice.current ||
      typeof window.requestAnimationFrame !== "function"
    ) {
      // Skip entrance on touch or timing-constrained browsers.
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
      scheduleFrame(() => {
        scheduleFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      });
    });
  }, []);

  /* ── Unified rAF parallax + physics loop ─────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const isTouch = isTouchDevice.current;
    sectionsRef.current = Array.from(
      document.querySelectorAll<HTMLElement>(".narrative-section")
    );

    /* Mouse tracking — desktop */
    const onMove = (e: PointerEvent) => {
      mouseRef.current.x = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      mouseRef.current.y = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
      slabPhysRef.current.active = true;
    };
    const onLeave = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      slabPhysRef.current.active = false;
    };

    /* Touch tracking — mobile */
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      mouseRef.current.x = clamp((touch.clientX / window.innerWidth) * 2 - 1, -1, 1);
      mouseRef.current.y = clamp((touch.clientY / window.innerHeight) * 2 - 1, -1, 1);
      slabPhysRef.current.active = true;
    };
    const onTouchEnd = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      slabPhysRef.current.active = false;
    };

    if (prefersReduced) {
      slabPhysRef.current.active = false;
    } else if (isTouch) {
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
    }

    const updateScrollState = () => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      scrollProgressRef.current = clamp(
        scrollYRef.current / maxScroll,
        0,
        1
      );
      scrollStageRef.current = getScrollStage(scrollProgressRef.current);
      sceneStateRef.current.scrollProgress = scrollProgressRef.current;
      sceneStateRef.current.stageIndex = getStageIndex(scrollStageRef.current.stage);
      sceneStateRef.current.stageProgress = scrollStageRef.current.stageProgress;

      sectionsRef.current.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        const distance = (sectionCenter - window.innerHeight / 2) /
          Math.max(window.innerHeight, 1);
        const presence = clamp(1 - Math.abs(distance), 0, 1);
        const direction = distance > 0 ? 1 : -1;
        const inner = section.querySelector<HTMLElement>(".narrative-section-inner");

        section.dataset.active = presence >= 0.5 ? "true" : "false";

        if (inner) {
          const quiet = 1 - presence;
          const visible = presence > 0.06;
          inner.style.visibility = visible ? "visible" : "hidden";
          inner.style.opacity = visible ? (0.08 + presence * 0.92).toFixed(3) : "0";
          inner.style.filter = `blur(${(quiet * 2.0).toFixed(2)}px)`;
          inner.style.transform =
            `translate3d(0, ${((quiet * 28 * direction)).toFixed(2)}px, 0) scale(${(0.986 + presence * 0.014).toFixed(3)})`;
        }
      });

      scrollLerpedRef.current = lerp(
        scrollLerpedRef.current,
        scrollYRef.current,
        SLAB_SCROLL_LERP
      );
      const sy = scrollLerpedRef.current;
      const norm = sy / Math.max(window.innerHeight, 1);
      sceneStateRef.current.slabDropPx = prefersReduced
        ? 0
        : norm * (isTouch ? SLAB_MAX_Y_TOUCH : SLAB_MAX_Y_DESKTOP);
    };

    const onScroll = () => {
      scrollYRef.current = window.scrollY;
      updateScrollState();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ── RAF loop ─────────────────────────────────────── */
    const tick = () => {
      const t = 0.055;
      currentRef.current.x = lerp(currentRef.current.x, mouseRef.current.x, t);
      currentRef.current.y = lerp(currentRef.current.y, mouseRef.current.y, t);
      const mx = prefersReduced ? 0 : currentRef.current.x;
      const my = prefersReduced ? 0 : currentRef.current.y;

      updateScrollState();

      /* ── Mouse target — drives WebGL mesh rotation via spring physics in SlabMesh ── */
      /* Hero.tsx writes target every frame (window-level pointermove, no blind spot).
         SlabMesh.useFrame reads target and runs spring physics independently.
         Separation of concerns: Hero writes target → SlabMesh computes physics.
         No double-write of p.pos/p.vel in two places. */
      const p = slabPhysRef.current;
      p.target.x = prefersReduced ? 0 : mx * 0.22;
      p.target.y = prefersReduced ? PHYS_REST_Y : my * 0.14 + PHYS_REST_Y;
      /* p.active is maintained by onMove/onLeave (window-level events) */

      /* ── DOM-level parallax: title ──────── */
      if (titleRef.current) {
        if (isTouch || prefersReduced) {
          titleRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        } else {
          titleRef.current.style.transform =
            `translate3d(${mx * TITLE_TX}px, ${my * TITLE_TY}px, 0)`;
        }
      }

      rafRef.current = scheduleFrame(tick);
    };

    rafRef.current = scheduleFrame(tick);

    return () => {
      cancelFrame(rafRef.current);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <main
      id="hero"
      aria-label="Recursive intelligence homepage"
      className="relative min-h-[500svh] overflow-x-hidden"
      style={{
        isolation: "isolate",
      }}
    >
      {/* (VoidField3D now lives inside WebGLSlab — see /components/WebGLSlab.tsx) */}

      {/* ── Brand (top-left) ──────────────────────────── */}
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
        <span className="ml-[10px]" style={{ color: "#EDE9E3", fontStyle: "normal" }}>
          Spatial
        </span>
      </header>

      {/* ── Meta (top-right) ──────────────────────────── */}
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

      {/* ── WebGL architectural slab ───────────────── */}
      {/* The fixed wrapper never receives transforms. Scroll movement is passed
          into the R3F scene through sceneStateRef so only slab/ground move. */}
      <div
        className="fixed inset-0 z-[5] h-[100svh] w-screen overflow-hidden pointer-events-none"
      >
        <WebGLSlab physRef={slabPhysRef} sceneStateRef={sceneStateRef} />
      </div>

      {/* ── Recursive narrative copy ───────────────────── */}
      <div className="relative z-20">
        {homepageSections.map((section, index) => (
          <NarrativeSection
            key={section.stage}
            section={section}
            isIntro={index === 0}
            titleRef={index === 0 ? titleRef : undefined}
          />
        ))}
      </div>

      {/* ── Noscript fallback ─────────────────────────── */}
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
