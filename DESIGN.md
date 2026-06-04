# Design Language — Spatial 2.5D Hero

## 1. Aesthetic Direction

**Reference point:** Architectural photography books, film noir establishing shots, Swiss editorial design, and high-end SaaS product pages (Linear, Vercel, Stripe).

The page should feel like a *quiet room* — not quiet because nothing is happening, but because every element that exists has earned its place.

---

## 2. Color System

All tokens are defined in `app/globals.css` via Tailwind v4 `@theme` directive.

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
| Eyebrow | `10px` | normal | Italic, `letter-spacing: 0.36em`, uppercase |
| Title | `clamp(36px, 6vw, 64px)` | 400 | Normal + italic accent, `letter-spacing: -0.015em` |
| Subtitle | `15px` | normal | Italic, `letter-spacing: 0.01em` |
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
| z-0 | Background gradient | 0 | Low (0.8px/0.6px) |
| z-0 | Grid overlay | 0 | Zero |
| z-3 | Void particle field | 3 | Zero |
| z-4 | Atmospheric glow | 4 | Zero |
| z-5 | WebGL slab | 5 | Medium scroll |
| z-10 | Brand / Meta | 10 | Zero |
| z-20 | Editorial copy | 20 | Zero |

### Spatial Composition

- WebGL slab is the **single focal object** — all copy is positioned around it, not competing with it
- Slab sits in the lower half of the viewport, receding toward a vanishing point
- Copy block is in the upper 40% of the viewport
- Atmospheric radial glow sits behind the slab, creating depth separation
- Negative space is treated as a compositional element, not emptiness

### Responsive Strategy

| Breakpoint | Behavior |
|------------|---------|
| `≤ 768px` | Copy top `12vh`, padding `24px`, title `clamp(28px,8vw,48px)` |
| `≤ 400px` | Copy top `10vh`, padding `16px`, title `clamp(24px,9vw,36px)` |
| `landscape h≤500px` | Subtitle hidden, copy top `6vh` |
| `hover:none + pointer:coarse` | Entrance animation disabled, DPR capped at 1 |

---

## 5. Animation Philosophy

### Principles

1. **Animation serves depth, not decoration.** Every motion should feel like physical consequence — inertia, gravity, settling — not a loading state or feedback mechanism.
2. **No bounce, no overshoot, no elastic.** Motion uses `cubic-bezier(0.28, 0.72, 0.18, 1)` — a slow-in, confident-out ease. Entrance uses this. Nothing else uses it.
3. **Entrance is the only orchestrated animation.** Staggered fade+translate, ~1s total. On touch devices, disabled entirely.
4. **Parallax is ambient, not interactive.** It responds to pointer position continuously, not on discrete events.

### Parallax Depth Map

| Layer | Amplitude | Rationale |
|-------|-----------|-----------|
| Background | `tx=0.8px, ty=0.6px` | Barely perceptible; just enough to feel spatial |
| Title | `tx=-0.3px, ty=-0.2px` | Counter-displacement; creates depth separation from background |
| Eyebrow / Subtitle / CTA | `0` | Text must remain legible; any parallax hurts readability |
| WebGL slab | Mouse-driven tilt via physics | Inertia + gravity model; explained in `AGENTS.md` |

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

---

## 6. WebGL Details

### Scene

- **Camera:** `position [0, 2.0, 5.2]`, `fov 42` — narrow FOV for architectural feel
- **Lighting:** Ambient `#1a2030` (cool dark blue), Directional from `[3,6,4]` with warm-white `#c8d8f0`, Point at `[0,-2,2]` with deep blue `#2040a0` for ground bounce
- **Background:** Transparent (alpha canvas)

### Slab Mesh

- `boxGeometry [4.2, 0.035, 2.6]` — a flat, wide slab
- Custom `shaderMaterial` with:
  - Anti-aliased grid lines via `fwidth` (no mipmap artifacts)
  - Two grid scales: coarse (0.08) + fine (0.02)
  - Diagonal cross-hatch accent
  - Edge darkening (faux AO)
  - Normal-based lighting
  - Radial pulse glow (time-driven)
  - uMouse-driven sheen for pointer proximity

### Ground Plane

- Perspective grid receding toward vanishing point at `[0.5, 1.0]`
- Radial + depth fade alpha
- Slow scanline sweep (time-driven, barely visible)
- Vanishing point glow

---

## 7. What to Never Change

Without explicit user direction, the following are **constraints**, not suggestions:

- **Font:** Georgia. Never swap for Inter/Roboto/system-ui.
- **Palette:** Obsidian + warm off-white. Never use `#FFFFFF` or saturated accent colors.
- **No bounce/overshoot:** `cubic-bezier(0.28, 0.72, 0.18, 1)` only. No `ease-out-back`, no spring libraries.
- **Single focal object:** The slab is the only 3D element. Never add a second mesh, particle burst, or competing visual.
- **CTA:** Pure CSS hover, zero JS handlers. Never attach React event handlers to the CTA.
- **Parallax:** Background + title only. Eyebrow, subtitle, CTA = zero parallax always.
- **Mobile:** DPR capped at 1. Entrance animation disabled. Parallax amplitude halved.
- **`prefers-reduced-motion`:** Both entrance animation and parallax must be killed when set.
