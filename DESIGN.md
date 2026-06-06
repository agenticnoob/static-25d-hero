# Design Language — Spatial 2.5D Hero

## 1. Aesthetic Direction

**Reference point:** Son Daven's dark resort storytelling, architectural photography books, film noir establishing shots, Apple product-page pacing, Stripe spatial storytelling, Linear restraint, Vercel contrast, and Raycast-level interaction polish.

The page should feel like a _dream valley interface_ — not a hotel page, and not a copied reference, but a quiet spatial surface where stone, mist, restrained page chrome, and AI-recursive interface thinking meet.

The interaction target is premium product-page motion: fluid, restrained, legible, and physically believable. Avoid cheap spectacle: no random flying particles, no neon cyberpunk wash, no flashing, no crowded screen, no decorative WebGL that ignores the narrative.

---

## 2. Color System

CSS-facing design tokens are defined in `app/globals.css` via Tailwind v4 `@theme` directive. The HTML/page chrome layer uses the `#142334` + `#baccd9` two-tone contrast system. WebGL shader and material colors remain part of the recursive fossil material system and should not be recolored in the same pass unless a separate WebGL material decision is approved.

### Two-Tone Signal Palette

| Token               | Hex       | Role                                       |
| ------------------- | --------- | ------------------------------------------ |
| `--color-obs-deep`  | `#142334` | Deep blue page base                        |
| `--color-obs-base`  | `#142334` | Background mid and dark surface continuity |
| `--color-obs-top`   | `#baccd9` | Pale UI signal light                       |
| `--color-obs-front` | `#142334` | Reserved for surface contrast              |
| `--color-obs-side`  | `#142334` | Reserved for 3D face shading               |

### Edge Light

| Token                 | Value                    | Role                              |
| --------------------- | ------------------------ | --------------------------------- |
| `--color-edge-light`  | `rgba(186,204,217,0.50)` | Pale signal highlight             |
| `--color-edge-signal` | `rgba(186,204,217,0.28)` | Secondary low-opacity signal edge |
| `--color-edge-glow`   | `rgba(186,204,217,0.14)` | Atmospheric halo                  |

### Signal Washes

| Token              | Value                    | Role                 |
| ------------------ | ------------------------ | -------------------- |
| `--color-aurora-a` | `rgba(186,204,217,0.18)` | Pale signal wash     |
| `--color-aurora-b` | `rgba(20,35,52,0.62)`    | Deep blue depth wash |
| `--color-aurora-c` | `rgba(186,204,217,0.10)` | Low signal glow      |

### Text

| Token             | Hex                      | Role                        |
| ----------------- | ------------------------ | --------------------------- |
| `--color-ink`     | `#baccd9`                | Primary text and signal ink |
| _(inline styles)_ | `rgba(186,204,217,0.78)` | Secondary text              |
| _(inline styles)_ | `rgba(186,204,217,0.68)` | Tertiary / subtitle         |
| _(inline styles)_ | `rgba(186,204,217,0.40)` | Meta / decorative           |

**Constraint:** The DOM/page chrome layer is now a two-color contrast system: `#142334` and `#baccd9`. Do not recolor the WebGL monolith materials in the same pass; treat WebGL material changes as a separate design/performance decision.

---

## 3. Typography

Font: **Georgia** (serif) — available on all macOS/iOS devices. Fallback chain: `"Times New Roman", "SF Pro Display", "Segoe UI", Arial, serif`.

### Scale

| Element         | Size                       | Weight | Style                                       |
| --------------- | -------------------------- | ------ | ------------------------------------------- |
| Brand           | `10px`                     | normal | Italic, `letter-spacing: 0.38em`            |
| Kicker          | `10px`                     | normal | Italic, `letter-spacing: 0.28em`, uppercase |
| Narrative title | `clamp(34px, 5.2vw, 66px)` | 400    | Georgia, `letter-spacing: -0.015em`         |
| Narrative body  | `15px`                     | normal | Italic, `letter-spacing: 0.01em`            |
| CTA             | `10.5px`                   | normal | Uppercase, `letter-spacing: 0.24em`         |
| Meta            | `9.5px`                    | normal | Italic, `letter-spacing: 0.26em`            |

### Constraints

- **Eyebrow italic descenders:** Georgia italic descenders (g, y, j, p, q) clip at container bottom. Fix: `padding-bottom: 2px` on `.eyebrow` — this is intentional and documented in CSS.
- **Line height for title:** `1.12` — tight, editorial
- **Line height for subtitle:** `1.65` — generous, readable
- **Never use:** Inter, Roboto, system-ui for body text. This is an architectural/editorial aesthetic.

---

## 4. Layout

### Visual Hierarchy (z-axis)

| Layer | Element                     | z-index | Parallax                                                  |
| ----- | --------------------------- | ------- | --------------------------------------------------------- |
| z-0   | CSS background / atmosphere | 0       | Site-owned background, no WebGL draw call                 |
| z-0   | Grid or soft depth field    | 0       | CSS-owned if reintroduced                                 |
| z-4   | Atmospheric glow            | 4       | Zero                                                      |
| z-5   | WebGL recursive monolith    | 5       | Fixed object + camera rail + restrained material response |
| z-10  | Brand / Meta                | 10      | Zero                                                      |
| z-20  | Narrative copy / CTA        | 20      | Scroll stage state + CSS state transitions                |

### Spatial Composition

- The WebGL recursive monolith is the **single focal object**. Stage effects must modify this object, not introduce a second focal mesh.
- The visual field must read as foreground / midground / background:
  - Foreground: narrative copy, CTA, fine line UI, optional glass-like panels.
  - Midground: WebGL recursive monolith as the narrative object.
  - Background: CSS-owned page ground using the `#142334` + `#baccd9` chrome palette.
- The stela sits in the lower half of the viewport, receding toward a vanishing point.
- The fixed WebGL wrapper must remain `top: 0`, `bottom: 100svh`, and `transform: none` during scroll.
- Scroll-driven meaning happens inside R3F through a damped visual scroll value, camera rail interpolation, and subtle scroll-velocity material response. The object remains fixed and stable; never apply scroll transforms to the fixed DOM wrapper.
- Narrative copy changes posture by stage:
  - Observation: centered thesis.
  - Causality: left-weighted, explaining the chain.
  - Recursion: right-weighted, implying feedback.
  - Self-reference: narrow centered copy.
  - Reconstruction: lower-left final proposition with CTA.
- Atmospheric depth should come from CSS/page background and WebGL object lighting, not a full-screen WebGL background quad.
- Negative space is treated as a compositional element, not emptiness
- Glass, translucency, fine borders, gradients, and shadow layers are allowed when they clarify hierarchy. They must stay soft and low saturation.

### Responsive Strategy

| Breakpoint                    | Behavior                                                          |
| ----------------------------- | ----------------------------------------------------------------- |
| `≤ 768px`                     | Stage layout recenters, title `clamp(27px,8vw,44px)`, body `13px` |
| `≤ 400px`                     | Padding `18px`, title `clamp(25px,8.5vw,34px)`, body `12.5px`     |
| `landscape h≤500px`           | Subtitle hidden, copy top `6vh`                                   |
| `hover:none + pointer:coarse` | Entrance animation disabled, DPR capped at 1                      |

---

## 5. Animation Philosophy

### Principles

1. **Animation serves depth, not decoration.** Motion should feel like camera observation, material response, or state transition.
2. **No bounce, no elastic spectacle.** There is no active rigid-body room, gravity, or collision model. The object should not behave like a game prop.
3. **Scroll is the primary timeline.** The current implementation uses a custom rAF/ref loop. A future Lenis + GSAP ScrollTrigger migration may own smooth input, pin, scrub, progress, and section transitions.
4. **UI micro-interactions stay restrained.** Current CTA hover/focus is pure CSS by constraint. Motion is a future UI layer only if the CTA event-handler constraint is deliberately revisited.
5. **Parallax is ambient, not noisy.** It responds continuously to scroll and pointer position, but never makes body copy hard to read.

### Parallax Depth Map

| Layer                    | Amplitude                                 | Rationale                                                                                   |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Background               | `0`                                       | CSS-owned site background; WebGL canvas remains transparent                                 |
| Title                    | `tx=-0.3px, ty=-0.2px`                    | Counter-displacement; creates depth separation from background                              |
| Eyebrow / Subtitle / CTA | `0`                                       | Text must remain legible; any parallax hurts readability                                    |
| WebGL monolith           | Camera rail + restrained pointer parallax | Fixed object, stage-aware camera position/look-at/roll, and low-amplitude material response |

### WebGL Interaction Model

The current WebGL object is fixed in world space. `Hero.tsx` writes pointer target and derived scroll state into refs; `WebGLSlab.tsx` reads those refs inside `useFrame`.

- `coreInteractionRef.target` comes from window-level pointer tracking.
- `coreInteractionRef.pos` eases toward the target and only feeds pointer parallax/material uniforms.
- `sceneStateRef.scrollProgress` drives camera rail interpolation along one continuous arc-length path across the five narrative stages.
- There is no gravity, collision, restitution, rigid body, room wall, or random impulse.
- The object may rotate slightly as part of stage posture, but the story is primarily told by the camera.

### Scroll Stage Presence

Each narrative section receives `data-active` from the unified `Hero.tsx` rAF loop. Sections use sticky inner content and varied `svh` lengths so scrolling feels like a sequence of held camera moments, not equal-height slides. Active text is full opacity; inactive text recedes through lower opacity, slight blur, and restrained y translation. These scroll-driven values are written directly by the rAF loop, so `.narrative-section-inner` must not also transition `opacity`, `filter`, or `transform` in CSS.

The WebGL object does not consume raw scroll progress directly. `Hero.tsx` keeps raw progress for content presence, then derives a damped visual progress for `sceneStateRef`. Camera movement samples that continuous `scrollProgress` along the full rail path, while `stageIndex` / `stageProgress` continue to drive material state and narrative posture. This prevents stage-boundary stalls and sudden speed changes from uneven rail segment lengths.

Object transforms that affect visible pose must also use continuous `scrollProgress`-derived values. Do not drive mesh rotation or position directly from integer `stageIndex`, because section boundaries would create a visible snap.

### Target Motion Architecture

The next implementation should replace the custom rAF-driven scroll system with a clearer stack:

| Layer           | Library               | Responsibility                                                              |
| --------------- | --------------------- | --------------------------------------------------------------------------- |
| Smooth input    | Lenis                 | Wheel/touch smoothing, normalized velocity, reduced-motion fallback         |
| Timeline        | GSAP ScrollTrigger    | `pin`, `scrub`, section progress, stage transitions                         |
| Shared state    | Zustand               | `scrollProgress`, `scrollVelocity`, `mouse`, `viewport`, `sceneMode`        |
| WebGL rendering | Three.js / R3F / drei | Camera rail, recursive monolith geometry, shader material, background scene |
| UI motion       | Motion                | Text entrance, CTA hover, layout transitions, subtle panel movement         |

One library owns each responsibility. Avoid having GSAP, Motion, CSS transitions, and rAF all animate the same `transform` or `opacity` at the same time.

`prefers-reduced-motion` keeps scroll-stage state updates active, but disables pointer/title parallax. This keeps the page readable without motion dependency.

---

## 6. WebGL Details

### Scene

- **Camera:** stage-aware rail from `CAMERA_RAIL_DESKTOP` / `CAMERA_RAIL_COMPACT`, `fov 48` — restrained product-page observation rather than object physics
- **Lighting model:** one main `directionalLight` plus `ContactShadows`. Imported model materials are enhanced with `MeshStandardMaterial` / `MeshPhysicalMaterial` tuning and `onBeforeCompile` recursive fossil uniforms.
- **Background:** Transparent (alpha canvas)
- **drei usage:** `PerspectiveCamera`, `useGLTF`, and `ContactShadows` are active. Do not add helper effects that become a second focal point.
- **Physics usage:** none in the active scene. `@react-three/rapier` is not part of the current runtime.

### Recursive Fossil Monolith

- The current visible subject is the optimized GLB at `public/models/black-layered-prism.optimized.glb`.
- The model is scaled to `MODEL_TARGET_HEIGHT` and centered inside `MonolithModel`.
- The mesh group remains a single focal object; imported submeshes are craft details, not separate visual subjects.
- `CAMERA_RAIL_DESKTOP` and `CAMERA_RAIL_COMPACT` define stage-aware camera position, look-at target, and roll. Runtime sampling uses a continuous Catmull-Rom path for position/look-at so motion remains even across unequal rail segment distances.
- `deriveRecursiveFossilMaterialState()` maps `SceneState` into:
  - `threshold` for silhouette-to-signal reveal
  - `engraving` for causal trace intensity
  - `feedback` for recursive and mirror-like bands
  - `compression` for the AI-compressed fossil read
  - `signal` for the final stabilized material response
- `installRecursiveFossilShader()` injects uniforms into imported model materials using `onBeforeCompile`. It should remain a material layer on the single GLB subject, not a second visual system.
- Procedural stone textures add restrained mineral grain, bump, and roughness without external image dependencies.
- `Hero.tsx` waits for fonts and the GLB `MonolithModel` mount signal before removing the `scene-preloader`, preventing the page from becoming scrollable before the focal object exists.

Avoid circular loop/ring motifs, torus silhouettes, through-holes, thin slabs, and visible physics rooms. The object should read first as a believable artifact, then as a philosophical/AI system through its secondary details.

### Canvas Sizing Rule

The WebGL DOM wrapper must stay:

```tsx
className = "fixed inset-0 z-[5] h-[100svh] w-screen overflow-hidden pointer-events-none";
```

Do not add a CSS `transform`, `filter`, or `perspective` to this wrapper or any ancestor that should behave as viewport-fixed. Those properties can create a fixed-position containing block and make the canvas appear to move with page scroll. Use R3F object transforms for slab movement instead.

---

## 7. What to Never Change

Without explicit user direction, the following are **constraints**, not suggestions:

- **Font:** Georgia. Never swap for Inter/Roboto/system-ui.
- **Palette:** DOM/page chrome uses `#142334` + `#baccd9`. WebGL monolith material colors are separate and should not be changed without a dedicated material pass.
- **No cheap bounce/overshoot:** no `ease-out-back`, elastic, playful rebound, rigid-body bouncing, or collision spectacle.
- **Single focal object:** The recursive monolith is the only 3D subject. Never add a second object, particle burst, room cage, or competing visual.
- **CTA:** Pure CSS hover, zero JS handlers. Never attach React event handlers to the CTA.
- **Parallax:** Title counter-parallax only on non-touch devices. Narrative kicker/body/CTA = zero pointer parallax.
- **Mobile:** DPR capped at 1. Entrance animation disabled. Parallax amplitude halved.
- **`prefers-reduced-motion`:** Entrance animation and pointer/title parallax must be killed when set. Scroll-stage readability state may still update.
