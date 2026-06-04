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
     WebGL slab  : CSS scroll parallax (translateY + rotateX/rotateY via slabRef)
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
const SLAB_MAX_Y         = 55;
const SLAB_COUNTER_ROTATE_X = 0.025;
const SLAB_COUNTER_ROTATE_Y = 0.015;

/* Mouse → WebGL physics (physRef) */
const PHYS_SPRING  = 0.045;
const PHYS_DAMPING = 0.82;
const PHYS_REST_Y  = 0.18;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/* ─────────────────────────────────────────────────────────────────
   Hero
   ───────────────────────────────────────────────────────────────── */

export default function Hero() {
  /* ── Refs ─────────────────────────────────────────────── */
  const titleRef  = useRef<HTMLHeadingElement>(null);
  const slabRef   = useRef<HTMLDivElement>(null);
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

    if (prefersReduced || isTouchDevice.current) {
      // Skip entrance on touch — content is immediately readable
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

  /* ── Unified rAF parallax + physics loop ─────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));

    const isTouch = isTouchDevice.current;

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

    if (isTouch) {
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
      window.addEventListener("blur", onLeave);
    }

    const onScroll = () => { scrollYRef.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ── RAF loop ─────────────────────────────────────── */
    const tick = () => {
      const t = 0.055;
      currentRef.current.x = lerp(currentRef.current.x, mouseRef.current.x, t);
      currentRef.current.y = lerp(currentRef.current.y, mouseRef.current.y, t);
      const mx = currentRef.current.x;
      const my = currentRef.current.y;

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

      /* ── Mouse target — drives WebGL mesh rotation via spring physics in SlabMesh ── */
      /* Hero.tsx writes target every frame (window-level pointermove, no blind spot).
         SlabMesh.useFrame reads target and runs spring physics independently.
         Separation of concerns: Hero writes target → SlabMesh computes physics.
         No double-write of p.pos/p.vel in two places. */
      const p = slabPhysRef.current;
      p.target.x = mx * 0.22;
      p.target.y = my * 0.14 + PHYS_REST_Y;
      /* p.active is maintained by onMove/onLeave (window-level events) */

      /* ── DOM-level parallax: title ──────── */
      if (titleRef.current) {
        if (isTouch) {
          titleRef.current.style.transform = `translate3d(0px, 0px, 0px)`;
        } else {
          titleRef.current.style.transform =
            `translate3d(${mx * TITLE_TX}px, ${my * TITLE_TY}px, 0)`;
        }
      }

      /* ── DOM-level scroll parallax: slab wrapper ──────── */
      if (slabRef.current) {
        scrollLerpedRef.current = lerp(
          scrollLerpedRef.current,
          scrollYRef.current,
          SLAB_SCROLL_LERP
        );
        const sy = scrollLerpedRef.current;
        const norm = sy / Math.max(window.innerHeight, 1);
        const slabY = norm * SLAB_MAX_Y;
        const rotX = -norm * SLAB_COUNTER_ROTATE_X;
        const rotY = mx * 0.008 - norm * SLAB_COUNTER_ROTATE_Y;

        slabRef.current.style.transform =
          `translate3d(0px, ${slabY}px, 0px) rotateX(${rotX}rad) rotateY(${rotY}rad)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
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
      {/* slabRef wraps the WebGL div for scroll-driven CSS parallax.
          slabPhysRef is passed into WebGLSlab so Hero.tsx's RAF loop
          can update the physics state directly — no event-blind-spot. */}
      <div
        ref={slabRef}
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
