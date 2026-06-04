# Design Language — Spatial 2.5D Hero

## 1. Aesthetic Direction

**Reference point:** Architectural photography books, film noir establishing shots, Swiss editorial design, Apple product pages, Stripe spatial storytelling, Linear restraint, Vercel contrast, and Raycast-level interaction polish.

The page should feel like a *quiet room* — not quiet because nothing is happening, but because every element that exists has earned its place.

The interaction target is premium product-page motion: fluid, restrained, legible, and physically believable. Avoid cheap spectacle: no random flying particles, no neon cyberpunk wash, no flashing, no crowded screen, no decorative WebGL that ignores the narrative.

---

## 2. Color System

CSS-facing design tokens are defined in `app/globals.css` via Tailwind v4 `@theme` directive. WebGL shader colors are literal GLSL `vec3` values, but they are mapped to the same obsidian + warm off-white identity and must be updated with this section when changed.

### Obsidian Palette (Background)

| Token | Hex | Role |
|-------|-----|------|
| `--color-obs-deep` | `#0A0C12` | Deepest void, page base |
| `--color-obs-base` | `#0F1219` | Background gradient mid |
| `--color-obs-top` | `#161B26` | Background gradient top |
| `--color-obs-front` | `#0D1018` | Reserved for surface contrast |
| `--color-obs-side` | `#111520` | Reserved for 3D face shading |

### Edge Light

| Token | Value | Role |
|-------|-------|------|
| `--color-edge-light` | `rgba(80,200,255,0.55)` | Cool blue highlight |
| `--color-edge-warm` | `rgba(255,170,80,0.22)` | Warm counter-accent (currently unused) |
| `--color-edge-glow` | `rgba(100,220,255,0.12)` | Atmospheric halo |

### Aurora Washes

| Token | Value | Role |
|-------|-------|------|
| `--color-aurora-a` | `rgba(40,10,80,0.22)` | Purple depth wash |
| `--color-aurora-b` | `rgba(0,40,70,0.18)` | Blue depth wash |
| `--color-aurora-c` | `rgba(10,60,50,0.14)` | Teal depth wash |

### Text

| Token | Hex | Role |
|-------|-----|------|
| `--color-ink` | `#EDE9E3` | Primary text (warm off-white) |
| *(inline styles)* | `rgba(237,233,227,0.75)` | Secondary text |
| *(inline styles)* | `rgba(237,233,227,0.52)` | Tertiary / subtitle |
| *(inline styles)* | `rgba(237,233,227,0.32)` | Meta / decorative |

**Constraint:** Never use pure white `#FFFFFF`. Always warm the white with cream/off-white tones.

---

## 3. Typography

Font: **Georgia** (serif) — available on all macOS/iOS devices. Fallback chain: `"Times New Roman", "SF Pro Display", "Segoe UI", Arial, serif`.

### Scale

| Element | Size | Weight | Style |
|---------|------|--------|-------|
| Brand | `10px` | normal | Italic, `letter-spacing: 0.38em` |
| Kicker | `10px` | normal | Italic, `letter-spacing: 0.28em`, uppercase |
| Narrative title | `clamp(34px, 5.2vw, 66px)` | 400 | Georgia, `letter-spacing: -0.015em` |
| Narrative body | `15px` | normal | Italic, `letter-spacing: 0.01em` |
| CTA | `10.5px` | normal | Uppercase, `letter-spacing: 0.24em` |
| Meta | `9.5px` | normal | Italic, `letter-spacing: 0.26em` |

### Constraints

- **Eyebrow italic descenders:** Georgia italic descenders (g, y, j, p, q) clip at container bottom. Fix: `padding-bottom: 2px` on `.eyebrow` — this is intentional and documented in CSS.
- **Line height for title:** `1.12` — tight, editorial
- **Line height for subtitle:** `1.65` — generous, readable
- **Never use:** Inter, Roboto, system-ui for body text. This is an architectural/editorial aesthetic.

---

## 4. Layout

### Visual Hierarchy (z-axis)

| Layer | Element | z-index | Parallax |
|-------|---------|---------|---------|
| z-0 | Background gradient / atmosphere | 0 | Fixed WebGL `BgQuad`, no pointer parallax |
| z-0 | Grid or soft depth field | 0 | Zero or very low |
| z-4 | Atmospheric glow | 4 | Zero |
| z-5 | WebGL slab / physics object | 5 | Stage pose + pointer tilt + restrained rigid-body response |
| z-10 | Brand / Meta | 10 | Zero |
| z-20 | Narrative copy / CTA | 20 | ScrollTrigger section state + Motion micro-interactions |

### Spatial Composition

- WebGL slab is the **single focal object**. Stage effects must modify this slab, not introduce a second focal mesh.
- The visual field must read as foreground / midground / background:
  - Foreground: narrative copy, CTA, fine line UI, optional glass-like panels.
  - Midground: WebGL slab as the interactive narrative object.
  - Background: fixed atmospheric gradient, depth field, and soft shadow/glow.
- Slab sits in the lower half of the viewport, receding toward a vanishing point.
- The fixed WebGL wrapper must remain `top: 0`, `bottom: 100svh`, and `transform: none` during scroll.
- Scroll-driven slab movement happens inside R3F through a damped visual scroll value, stage pose interpolation, and subtle scroll-velocity response. Scale, pitch, yaw, roll, and position may change by stage; never apply scroll transforms to the fixed DOM wrapper.
- Narrative copy changes posture by stage:
  - Observation: centered thesis.
  - Causality: left-weighted, explaining the chain.
  - Recursion: right-weighted, implying feedback.
  - Self-reference: narrow centered copy.
  - Reconstruction: lower-left final proposition with CTA.
- Atmospheric radial glow sits behind the slab, creating depth separation
- Negative space is treated as a compositional element, not emptiness
- Glass, translucency, fine borders, gradients, and shadow layers are allowed when they clarify hierarchy. They must stay soft and low saturation.

### Responsive Strategy

| Breakpoint | Behavior |
|------------|---------|
| `≤ 768px` | Stage layout recenters, title `clamp(27px,8vw,44px)`, body `13px` |
| `≤ 400px` | Padding `18px`, title `clamp(25px,8.5vw,34px)`, body `12.5px` |
| `landscape h≤500px` | Subtitle hidden, copy top `6vh` |
| `hover:none + pointer:coarse` | Entrance animation disabled, DPR capped at 1 |

---

## 5. Animation Philosophy

### Principles

1. **Animation serves depth, not decoration.** Every motion should feel like physical consequence: inertia, gravity, friction, settling, or state transition.
2. **No bounce, no elastic spectacle.** Rapier is a future optimization option, not part of the current implementation. If introduced, collision response must feel heavy and damped, not playful or game-like.
3. **Scroll is the primary timeline.** The current implementation uses a custom rAF/ref loop. A future Lenis + GSAP ScrollTrigger migration may own smooth input, pin, scrub, progress, and section transitions.
4. **UI micro-interactions stay restrained.** Current CTA hover/focus is pure CSS by constraint. Motion is a future UI layer only if the CTA event-handler constraint is deliberately revisited.
5. **Parallax is ambient, not noisy.** It responds continuously to scroll and pointer position, but never makes body copy hard to read.

### Parallax Depth Map

| Layer | Amplitude | Rationale |
|-------|-----------|-----------|
| Background | `0` | Fixed `BgQuad` shader; depth comes from gradient, grid, and atmospheric glow |
| Title | `tx=-0.3px, ty=-0.2px` | Counter-displacement; creates depth separation from background |
| Eyebrow / Subtitle / CTA | `0` | Text must remain legible; any parallax hurts readability |
| WebGL slab | Mouse-driven tilt + damped scroll-stage pose | Inertia + gravity, plus stage-aware x/y/z/scale/yaw/roll/pitch and restrained velocity response |

### Physics Model (WebGL Slab)

The slab tilts toward the pointer with spring-based inertia and a subtle gravity bias:

```
spring force:  vel = vel * damping + (target - pos) * spring
damping:       0.82 (per-frame friction)
gravity:       0.004 (downward bias when drifting, no active pointer)
rest state:    rotation.x = 0.18 (slight top-tilt toward viewer)
```

When the pointer leaves: the slab drifts back toward rest with gravity pulling its pitch down slightly, then settles via the spring.

This is intentionally **not** a 1:1 tilt. The lag and inertia make it feel physical.

### Scroll Stage Presence

Each narrative section receives `data-active` from the unified `Hero.tsx` rAF loop. Sections use sticky inner content and varied `svh` lengths so scrolling feels like a sequence of held camera moments, not equal-height slides. Active text is full opacity; inactive text recedes through lower opacity, slight blur, and restrained y translation. These scroll-driven values are written directly by the rAF loop, so `.narrative-section-inner` must not also transition `opacity`, `filter`, or `transform` in CSS.

The WebGL slab does not consume raw scroll progress directly. `Hero.tsx` keeps raw progress for content presence, then derives a damped visual progress for `sceneStateRef`. Stage progress uses short hold regions at the beginning and end of each stage, so the slab settles between spatial poses instead of moving at a constant mechanical rate.

### Target Motion Architecture

The next implementation should replace the custom rAF-driven scroll system with a clearer stack:

| Layer | Library | Responsibility |
|-------|---------|----------------|
| Smooth input | Lenis | Wheel/touch smoothing, normalized velocity, reduced-motion fallback |
| Timeline | GSAP ScrollTrigger | `pin`, `scrub`, section progress, stage transitions |
| Shared state | Zustand | `scrollProgress`, `scrollVelocity`, `mouse`, `viewport`, `sceneMode` |
| WebGL rendering | Three.js / R3F / drei | Camera, material helpers, slab composition, background scene |
| Physics | `@react-three/rapier` | Rigid-body inertia, collision, mass, damping, physical settling |
| UI motion | Motion | Text entrance, CTA hover, layout transitions, subtle panel movement |

One library owns each responsibility. Avoid having GSAP, Motion, CSS transitions, and rAF all animate the same `transform` or `opacity` at the same time.

`prefers-reduced-motion` keeps scroll-stage state updates active, but disables pointer/title parallax. This keeps the page readable without motion dependency.

---

## 6. WebGL Details

### Scene

- **Camera:** `position [0, 2.0, 5.2]`, `fov 42` — narrow FOV for architectural feel
- **Lighting:** Ambient `#1a2030` (cool dark blue), Directional from `[3,6,4]` with warm-white `#c8d8f0`, Point at `[0,-2,2]` with deep blue `#2040a0` for underside separation
- **Background:** Transparent (alpha canvas)
- **drei usage:** `@react-three/drei` is installed but currently unused. Prefer `Environment`, `ContactShadows`, camera helpers, and material utilities only when they improve depth or reduce boilerplate. Do not add helper effects that become a second focal point.
- **Rapier usage:** Not implemented in the current version. If a future phase adds it, use fixed or kinematic guide bodies for invisible constraints, and one damped dynamic/kinematic rigid body for the slab where it improves inertia. Collisions should be subtle and architectural.

### Slab Mesh

- `boxGeometry [4.2, 0.035, 2.6, 32, 1, 18]` — a flat, wide slab with enough subdivisions for restrained vertex bending
- `STAGE_POSES` defines stage-aware x/y/z/scale/yaw/roll/pitch offsets. These are visible spatial changes, but still restrained enough to avoid a game-like flip.
- Custom `shaderMaterial` with:
  - Grey-white slab base that reads brighter than the obsidian background
  - Anti-aliased grid lines via `fwidth` (no mipmap artifacts)
  - Two grid scales: coarse (0.08) + fine (0.02)
  - Diagonal cross-hatch accent
  - Edge darkening (faux AO)
  - Normal-based lighting
  - Radial pulse glow (time-driven)
  - uMouse-driven sheen for pointer proximity
  - uInertia-driven observation sweep and material response
  - Restrained vertex bending via `vWarp`, driven by scroll phase and stage gates
  - Causality trace lines and low-contrast nodes
  - Recursion loop light paths
  - Self-reference mirror echo
  - Reconstruction network re-layout

### Canvas Sizing Rule

The WebGL DOM wrapper must stay:

```tsx
className="fixed inset-0 z-[5] h-[100svh] w-screen overflow-hidden pointer-events-none"
```

Do not add a CSS `transform`, `filter`, or `perspective` to this wrapper or any ancestor that should behave as viewport-fixed. Those properties can create a fixed-position containing block and make the canvas appear to move with page scroll. Use R3F object transforms for slab movement instead.

---

## 7. What to Never Change

Without explicit user direction, the following are **constraints**, not suggestions:

- **Font:** Georgia. Never swap for Inter/Roboto/system-ui.
- **Palette:** Obsidian + warm off-white. Never use `#FFFFFF` or saturated accent colors.
- **No cheap bounce/overshoot:** physics and Motion springs are allowed only when heavily damped and visually restrained. No `ease-out-back`, elastic, or playful rebound.
- **Single focal object:** The slab is the only 3D element. Never add a second mesh, particle burst, or competing visual.
- **CTA:** Pure CSS hover, zero JS handlers. Never attach React event handlers to the CTA.
- **Parallax:** Title counter-parallax only on non-touch devices. Narrative kicker/body/CTA = zero pointer parallax.
- **Mobile:** DPR capped at 1. Entrance animation disabled. Parallax amplitude halved.
- **`prefers-reduced-motion`:** Entrance animation and pointer/title parallax must be killed when set. Scroll-stage readability state may still update.
