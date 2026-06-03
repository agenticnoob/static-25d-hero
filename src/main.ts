/* ===========================================================
   Static 2.5D Hero — main.ts (quiet version)
   Responsibilities:
     1. Respect prefers-reduced-motion
     2. Pointer-driven parallax via CSS variables (--mx, --my
        on :root) — only two setProperty calls per frame
     3. A restrained entrance animation (no overshoot, no bounce)
     4. Touch / coarse-pointer: gentle sine wave so the scene
        still "breathes" without a real cursor
   No DOM generation. The scene is fully present in HTML.
   =========================================================== */
import "./style.css";
import { gsap } from "gsap";

/* ---------- Helpers ---------- */
const reduceMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);
const isReduced = reduceMotionQuery.matches;

/** Coarse-pointer detection: no real mouse = no real parallax. */
const hasFinePointer =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: fine)").matches
    : true;

/** Clamp a number to a range. */
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/* ===========================================================
   1. Pointer-driven parallax via CSS variables
   -----------------------------------------------------------
   The CSS in style.css uses var(--mx), var(--my) inside each
   layer's transform. We just write the smoothed values to
   :root once per rAF tick — no per-element style writes.
   =========================================================== */
function setupParallax(): () => void {
  if (isReduced) return () => {};

  const root = document.documentElement;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  const smoothing = 0.06; // smaller = more damped, more "premium"
  let rafId = 0;

  const writeVars = () => {
    root.style.setProperty("--mx", currentX.toFixed(4));
    root.style.setProperty("--my", currentY.toFixed(4));
  };

  if (hasFinePointer) {
    const onMove = (e: PointerEvent) => {
      // Normalize to -1..1
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = clamp(nx, -1, 1);
      targetY = clamp(ny, -1, 1);
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    const tick = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * smoothing;
      currentY += dy * smoothing;
      // Skip the setProperty calls when the eased value has effectively
      // converged — saves a few style invalidations per second when
      // the user isn't moving the mouse.
      if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
        writeVars();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    };
  }

  // Touch / coarse-pointer: gentle sine wave so the scene still
  // breathes without a real cursor.
  const start = performance.now();
  const tick = () => {
    const t = (performance.now() - start) / 1000;
    // Two combined sines per axis for a non-mechanical drift
    const mx = Math.sin(t * 0.28) * 0.4 + Math.sin(t * 0.17) * 0.18;
    const my = Math.cos(t * 0.22) * 0.25 + Math.sin(t * 0.13) * 0.12;
    root.style.setProperty("--mx", mx.toFixed(4));
    root.style.setProperty("--my", my.toFixed(4));
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(rafId);
}

/* ===========================================================
   2. Entrance animation — restrained, total ~1.0s
   -----------------------------------------------------------
   - The pyramid lifts into place: opacity 0→1, y 24→0
     (no scale, no overshoot — per spec)
   - Brand and meta fade in (corners)
   - Eyebrow, title, subtitle, CTA stagger in
   - No bounce, no overshoot. Easing is power2.out or quieter.
   =========================================================== */
function playEntrance(): void {
  const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

  // The pyramid lifts into place — the main reveal of the page.
  // Spec: opacity 0→1, translateY 24px→0. No scale.
  tl.fromTo(
    ".pyramid",
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" },
    0
  )
    // Corner marks settle in
    .fromTo(
      ".brand",
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.7 },
      0.1
    )
    .fromTo(
      ".meta",
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.7 },
      0.18
    )
    // Copy reveals in reading order
    .fromTo(
      ".eyebrow",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.65 },
      0.3
    )
    .fromTo(
      ".title",
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.85 },
      0.42
    )
    .fromTo(
      ".subtitle",
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.7 },
      0.62
    )
    .fromTo(
      ".cta-row",
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.6 },
      0.82
    );
}

/* ===========================================================
   3. Init
   =========================================================== */
function init(): void {
  const hero = document.getElementById("hero");
  if (!hero) {
    console.warn("[static-25d-hero] missing #hero");
    return;
  }

  setupParallax();

  // Wait one frame so initial CSS layout settles before GSAP reads it.
  requestAnimationFrame(() => {
    if (isReduced) {
      // Reduced motion: kill any tween state and set everything to
      // its visible, final position. (The CSS reduced-motion media
      // query also covers this, but we belt-and-braces it in JS so
      // the timeline never leaves the page in an in-between state.)
      gsap.set(
        [
          ".brand",
          ".meta",
          ".eyebrow",
          ".title",
          ".subtitle",
          ".cta-row",
          ".pyramid"
        ],
        { opacity: 1, y: 0, scale: 1, clearProps: "transform" }
      );
      return;
    }
    playEntrance();
  });

  // Live reduced-motion toggle — if the user flips the system
  // setting mid-session, snap everything into place.
  reduceMotionQuery.addEventListener?.("change", (e) => {
    if (e.matches) {
      gsap.globalTimeline.getChildren().forEach((t) => t.kill());
      gsap.set(
        [
          ".brand",
          ".meta",
          ".eyebrow",
          ".title",
          ".subtitle",
          ".cta-row",
          ".pyramid"
        ],
        { opacity: 1, y: 0, scale: 1, clearProps: "transform" }
      );
    }
  });
}

// Boot
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
