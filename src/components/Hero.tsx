"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";
import { homepageSections } from "@/content/homepage";
import { getCinematicScrollStage, getStageIndex } from "@/lib/interaction";
import { useHeroStore } from "@/lib/heroStore";
import WebGLSlab from "./WebGLSlab";
import NarrativeSection from "./NarrativeSection";

/* ─────────────────────────────────────────────────────────────────
   Entrance animation
   ───────────────────────────────────────────────────────────────── */

const ENTRANCE_ELEMENTS = [
  ".brand",
  ".meta",
  ".eyebrow",
  ".title",
  ".subtitle",
  ".cta-row",
] as const;

const EASE_QUIET = "cubic-bezier(0.28, 0.72, 0.18, 1)" as const;
const TRANSITION_DURATION = "0.9s";

const ENTRANCE_DELAYS: Record<string, number> = {
  ".brand": 0.1,
  ".meta": 0.18,
  ".eyebrow": 0.3,
  ".title": 0.42,
  ".subtitle": 0.62,
  ".cta-row": 0.82,
};

const TITLE_TX = -0.3;
const TITLE_TY = -0.2;
const POINTER_SCALE = {
  x: 0.22,
  y: 0.14,
};

const SCROLL_FOLLOW = 0.085;
const SCROLL_VELOCITY_DAMPING = 0.82;
const SCROLL_VELOCITY_LIMIT = 1.35;
const CORE_REST_Y = 0.18;
const TICK_EASE = 0.055;
const SCROLL_VELOCITY_RESPONSE = 0.22;

const WARP_STAGE = {
  enter: 0.02,
  start: 0.2,
  exit: 0.76,
  vanish: 0.96,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function scheduleFrame(callback: FrameRequestCallback): number {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(() => callback(Date.now()), 16);
}

function readPointerFromViewport(event: Pick<PointerEvent, "clientX" | "clientY">) {
  const { innerWidth, innerHeight } = window;
  const x = clamp((event.clientX / Math.max(innerWidth, 1)) * 2 - 1, -1, 1);
  const y = clamp((event.clientY / Math.max(innerHeight, 1)) * 2 - 1, -1, 1);
  return { x, y };
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
  const heroRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);

  const coreInteractionRef = useRef<{
    pos: THREE.Vector2;
    vel: THREE.Vector2;
    target: THREE.Vector2;
    active: boolean;
  }>({
    pos: new THREE.Vector2(0, CORE_REST_Y),
    vel: new THREE.Vector2(0, 0),
    target: new THREE.Vector2(0, CORE_REST_Y),
    active: false,
  });

  const sceneStateRef = useRef({
    rawScrollProgress: 0,
    scrollProgress: 0,
    stageIndex: 0,
    stageProgress: 0,
    scrollVelocity: 0,
  });

  const scrollVisualProgressRef = useRef(0);
  const scrollVelocityRef = useRef(0);

  const mouseRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const isTouchDevice = useRef(false);

  const rafRef = useRef(0);
  const isReady = sceneReady && fontsReady;

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const setPointerTarget = useHeroStore((state) => state.setPointerTarget);
  const setPointerCurrent = useHeroStore((state) => state.setPointerCurrent);
  const setPointerActive = useHeroStore((state) => state.setPointerActive);
  const setSceneState = useHeroStore((state) => state.setSceneState);
  const setSceneMode = useHeroStore((state) => state.setSceneMode);
  const setTouchDevice = useHeroStore((state) => state.setTouchDevice);
  const setReducedMotion = useHeroStore((state) => state.setPrefersReducedMotion);
  const setViewport = useHeroStore((state) => state.setViewport);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    let cancelled = false;

    if (!("fonts" in document)) {
      setFontsReady(true);
      return;
    }

    document.fonts.ready.then(() => {
      if (!cancelled) {
        setFontsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    if (isReady) {
      root.dataset.sceneReady = "true";
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      return undefined;
    }

    root.dataset.sceneReady = "false";
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      delete root.dataset.sceneReady;
    };
  }, [isReady]);

  /* ── Entrance animation ──────────────────────────────── */
  const hasRun = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || hasRun.current || !isReady) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    isTouchDevice.current =
      window.matchMedia("(hover: none) and (pointer: coarse)").matches || "ontouchstart" in window;

    hasRun.current = true;

    if (
      prefersReduced ||
      isTouchDevice.current ||
      typeof window.requestAnimationFrame !== "function"
    ) {
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
      el.style.transition = `opacity ${TRANSITION_DURATION} ${EASE_QUIET}, transform ${TRANSITION_DURATION} ${EASE_QUIET}`;
      el.style.transitionDelay = `${delay}s`;
      scheduleFrame(() => {
        scheduleFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      });
    });
  }, [isReady]);

  useEffect(() => {
    if (typeof window === "undefined" || !isReady) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.registerPlugin(ScrollTrigger);

    isTouchDevice.current =
      window.matchMedia("(hover: none) and (pointer: coarse)").matches || "ontouchstart" in window;

    setTouchDevice(isTouchDevice.current);
    setReducedMotion(prefersReduced);
    setViewport({
      width: window.innerWidth,
      height: window.innerHeight,
      isTouch: isTouchDevice.current,
      dpr: isTouchDevice.current ? 1 : 2,
    });

    sectionsRef.current = Array.from(
      heroRef.current?.querySelectorAll<HTMLElement>(".narrative-section") ?? [],
    );

    const clamp01 = (value: number) => clamp(value, 0, 1);

    const onPointerMove = (event: PointerEvent) => {
      const nextPointer = readPointerFromViewport(event);
      mouseRef.current.x = nextPointer.x;
      mouseRef.current.y = nextPointer.y;
      coreInteractionRef.current.active = true;
      setPointerActive(true);
      setPointerTarget(mouseRef.current);
    };

    const onPointerLeave = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      coreInteractionRef.current.active = false;
      setPointerActive(false);
      setPointerTarget(mouseRef.current);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 0) return;
      const touch = event.touches[0];
      const nextPointer = readPointerFromViewport(touch);
      mouseRef.current.x = nextPointer.x;
      mouseRef.current.y = nextPointer.y;
      coreInteractionRef.current.active = true;
      setPointerActive(true);
      setPointerTarget(mouseRef.current);
    };

    const onTouchEnd = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
      coreInteractionRef.current.active = false;
      setPointerActive(false);
      setPointerTarget(mouseRef.current);
    };

    if (prefersReduced) {
      coreInteractionRef.current.active = false;
    } else if (isTouchDevice.current) {
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
    } else {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
      window.addEventListener("blur", onPointerLeave);
    }

    const updatePresence = () => {
      const viewportH = Math.max(window.innerHeight, 1);
      sectionsRef.current.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const travel = Math.max(rect.height + viewportH, 1);
        const sectionProgress = clamp((viewportH - rect.top) / travel, 0, 1);
        const enter = smoothstep(WARP_STAGE.enter, WARP_STAGE.start, sectionProgress);
        const exit = 1 - smoothstep(WARP_STAGE.exit, WARP_STAGE.vanish, sectionProgress);
        const presence = enter * exit;
        const direction = sectionProgress < 0.5 ? 1 : -1;
        const inner = section.querySelector<HTMLElement>(".narrative-section-inner");

        section.dataset.active = presence >= 0.18 ? "true" : "false";

        if (inner) {
          const quiet = 1 - presence;
          const scale = 0.992 + presence * 0.008;
          inner.style.opacity = presence > 0.06 ? `${0.12 + presence * 0.88}` : "0";
          inner.style.filter = `blur(${(quiet * 1.35).toFixed(2)}px)`;
          inner.style.transform = `translate3d(0, ${(quiet * 18 * direction).toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        }
      });
    };

    const syncSceneState = (raw: number, rawVelocity: number) => {
      const clampedRaw = clamp01(raw);
      const follow = prefersReduced ? 1 : SCROLL_FOLLOW;
      const cinematic = getCinematicScrollStage(
        clamp01(lerp(scrollVisualProgressRef.current, clampedRaw, follow)),
      );

      const nextVisual = clamp01(lerp(scrollVisualProgressRef.current, clampedRaw, follow));
      scrollVisualProgressRef.current = nextVisual;
      const nextVelocity = lerp(
        scrollVelocityRef.current * SCROLL_VELOCITY_DAMPING,
        rawVelocity,
        SCROLL_VELOCITY_RESPONSE,
      );

      const stageIndex = getStageIndex(cinematic.stage);
      const clampedVelocity = clamp(nextVelocity, -SCROLL_VELOCITY_LIMIT, SCROLL_VELOCITY_LIMIT);
      const nextSceneState = {
        rawScrollProgress: clampedRaw,
        scrollProgress: nextVisual,
        stageIndex,
        stageProgress: cinematic.stageProgress,
        scrollVelocity: prefersReduced ? 0 : clampedVelocity,
      };
      scrollVelocityRef.current = clampedVelocity;

      sceneStateRef.current = nextSceneState;
      setSceneState(nextSceneState);
      setSceneMode(cinematic.stage);

      if (isTouchDevice.current && sectionsRef.current.length > 0) {
        const index = Math.round(cinematic.stageProgress + stageIndex);
        if (index >= 0 && index < homepageSections.length) {
          setSceneMode(homepageSections[index].stage);
        }
      }
    };

    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        isTouch: isTouchDevice.current,
        dpr: isTouchDevice.current ? 1 : 2,
      });
    };

    window.addEventListener("resize", onResize);

    const lenis = new (Lenis as any)({
      duration: prefersReduced ? 1 : 1.12,
      touchMultiplier: 1.2,
      infinite: false,
    }) as unknown as Lenis;
    let latestScroll = window.scrollY;

    const scroller = document.scrollingElement || document.documentElement;
    ScrollTrigger.scrollerProxy(scroller as HTMLElement, {
      scrollTop(value?: number) {
        if (typeof value === "number") {
          (lenis as any).scrollTo(value, { immediate: true });
          latestScroll = value;
          return value;
        }
        return latestScroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        };
      },
      pinType:
        scroller !== null && (scroller as HTMLElement).style.transform ? "transform" : "fixed",
    });

    const handleLenis = (event: { scroll: number; velocity?: number }) => {
      latestScroll = event.scroll;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const raw = clamp(latestScroll / maxScroll, 0, 1);
      const velocity = clamp(
        (event.velocity ?? 0) / 1200,
        -SCROLL_VELOCITY_LIMIT,
        SCROLL_VELOCITY_LIMIT,
      );

      syncSceneState(raw, prefersReduced ? 0 : velocity);
      setPointerCurrent(currentRef.current);
      updatePresence();
      ScrollTrigger.update();
    };

    lenis.on("scroll", handleLenis);

    const sectionTriggers = sectionsRef.current.map((section, index) => {
      const sectionHeight = Math.max(section.offsetHeight, window.innerHeight);
      return ScrollTrigger.create({
        id: `hero-section-${index}`,
        scroller,
        trigger: section,
        start: index === 0 ? "top top" : "top 85%",
        end: `+=${sectionHeight}`,
        scrub: true,
        pin: true,
        pinSpacing: true,
        onEnter: () => {
          const stage = homepageSections[index]?.stage ?? "observation";
          setSceneMode(stage);
        },
        onEnterBack: () => {
          const stage = homepageSections[index]?.stage ?? "observation";
          setSceneMode(stage);
        },
      });
    });

    const masterTrigger = ScrollTrigger.create({
      id: "hero-scroll-progress",
      scroller,
      trigger: heroRef.current,
      start: "top top",
      end: () => `+=${Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)}`,
      scrub: 0.1,
      onUpdate: (self) => {
        const velocity = clamp(
          (self.getVelocity() ?? 0) / 1200,
          -SCROLL_VELOCITY_LIMIT,
          SCROLL_VELOCITY_LIMIT,
        );
        syncSceneState(self.progress, prefersReduced ? 0 : velocity);
        updatePresence();
      },
    });

    const tick = (time: number) => {
      lenis.raf(time);
      const t = TICK_EASE;

      currentRef.current.x = lerp(currentRef.current.x, mouseRef.current.x, t);
      currentRef.current.y = lerp(currentRef.current.y, mouseRef.current.y, t);
      const mx = prefersReduced ? 0 : currentRef.current.x;
      const my = prefersReduced ? 0 : currentRef.current.y;

      const p = coreInteractionRef.current;
      p.target.x = mx * POINTER_SCALE.x;
      p.target.y = CORE_REST_Y + my * POINTER_SCALE.y;
      setPointerCurrent(currentRef.current);
      if (titleRef.current && !isTouchDevice.current && !prefersReduced) {
        titleRef.current.style.transform = `translate3d(${mx * TITLE_TX}px, ${my * TITLE_TY}px, 0)`;
      } else if (titleRef.current) {
        titleRef.current.style.transform = "translate3d(0px, 0px, 0px)";
      }

      rafRef.current = scheduleFrame(tick);
    };

    rafRef.current = scheduleFrame(tick);
    handleLenis({ scroll: window.scrollY, velocity: 0 });
    ScrollTrigger.refresh();

    return () => {
      cancelFrame(rafRef.current);
      lenis.off("scroll", handleLenis);
      (lenis as any).destroy();
      sectionTriggers.forEach((trigger) => trigger.kill(true));
      masterTrigger.kill(true);
      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.vars.id?.startsWith("hero-")) {
          trigger.kill(true);
        }
      });
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      ScrollTrigger.scrollerProxy(scroller as HTMLElement, {});
    };
  }, [
    isReady,
    setPointerActive,
    setPointerCurrent,
    setPointerTarget,
    setSceneMode,
    setSceneState,
    setTouchDevice,
    setReducedMotion,
    setViewport,
  ]);

  return (
    <main
      ref={heroRef}
      id="hero"
      aria-label="Recursive intelligence homepage"
      data-ready={isReady ? "true" : "false"}
      className="relative min-h-[500svh]"
      style={{ isolation: "isolate", overflowX: "clip", overflowY: "visible" }}
    >
      {/* Brand */}
      <header
        className="brand absolute z-10 select-none"
        style={{
          top: "30px",
          left: "36px",
          fontSize: "10px",
          letterSpacing: "0.38em",
          textTransform: "uppercase",
          color: "rgba(186, 204, 217, 0.58)",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        }}
      >
        <span
          className="inline-block"
          style={{
            width: "6px",
            height: "6px",
            border: "1px solid rgba(186, 204, 217, 0.58)",
            transform: "rotate(45deg)",
            position: "relative",
          }}
        >
          <span
            className="absolute inset-[2px]"
            style={{ background: "rgba(186, 204, 217, 0.5)" }}
          />
        </span>
        <span className="ml-[10px]" style={{ color: "#baccd9", fontStyle: "normal" }}>
          noobli
        </span>
      </header>

      {/* Meta */}
      <div
        className="meta absolute z-10 select-none"
        aria-hidden="true"
        style={{
          top: "30px",
          right: "36px",
          fontSize: "9.5px",
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: "rgba(186, 204, 217, 0.40)",
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span>dream valley</span>
        <span
          style={{
            width: "1px",
            height: "12px",
            background: "rgba(186, 204, 217, 0.24)",
            display: "inline-block",
          }}
        />
        <span>recursive interface</span>
      </div>

      <div className="fixed inset-0 z-[5] h-[100svh] w-full overflow-hidden pointer-events-none">
        <WebGLSlab
          coreInteractionRef={coreInteractionRef}
          sceneStateRef={sceneStateRef}
          onSceneReady={handleSceneReady}
        />
      </div>

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

      <noscript>
        <p
          style={{
            color: "#baccd9",
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
          文案可在没有 JavaScript 的情况下阅读；WebGL 视觉、滚动阶段和指针惯性需要脚本运行。
        </p>
      </noscript>

      {!isReady && (
        <div className="scene-preloader" aria-hidden="false" data-ready="false">
          <div className="scene-preloader__mark" />
          <div className="scene-preloader__text">dream valley interface</div>
        </div>
      )}
    </main>
  );
}
