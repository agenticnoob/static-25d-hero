# Spatial — 递归智能界面

一个中文为主、保留一句英文 thesis 的空间化 AI-native 个人主页。页面不是简历站，也不是项目索引；它用长滚动、固定 WebGL 画布、梦境山谷式色彩和短句叙事表达五个阶段：观察、因果、递归、自指、重构。

Tech stack: **Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Three.js / @react-three/fiber**

---

## Project layout

```
static-25d-hero/
├── app/
│   ├── globals.css       # Tailwind v4 @theme, narrative layout, signals, CTA, responsive rules
│   ├── layout.tsx        # Chinese metadata, dark root layout
│   └── page.tsx          # Renders the homepage
├── src/components/
│   ├── Hero.tsx          # Unified rAF loop, scroll stage state, fixed canvas wrapper
│   ├── NarrativeSection.tsx # Five sparse Chinese narrative stages
│   └── WebGLSlab.tsx     # Single R3F Canvas: transparent scene + recursive monolith object
├── src/content/
│   └── homepage.ts       # Chinese section copy and CTA
├── src/lib/
│   └── interaction.ts    # Scroll stages and shared scene state types
├── next.config.mjs
├── postcss.config.js     # Tailwind v4 PostCSS plugin
├── tsconfig.json         # Strict TypeScript
└── package.json
```

---

## Stack details

| Package                | Version | Role                                                                      |
| ---------------------- | ------- | ------------------------------------------------------------------------- |
| `next`                 | 16.2.7  | App router, SSR/SSG                                                       |
| `react` / `react-dom`  | 19.2.7  | UI                                                                        |
| `tailwindcss`          | 4.3.0   | Utility CSS via `@theme` directive                                        |
| `@tailwindcss/postcss` | 4.3.0   | Tailwind v4 PostCSS integration                                           |
| `three`                | 0.184.0 | Raw Three.js (geometry, materials, shaders)                               |
| `@react-three/fiber`   | 9.6.1   | React renderer for Three.js                                               |
| `@react-three/drei`    | 10.7.7  | `PerspectiveCamera`, `useGLTF`, and `ContactShadows` for the active scene |
| `typescript`           | 5.9.3   | Strict type checking                                                      |

No UI kit. Tailwind v4 remains the design-system layer.

### Interaction stack status

The implementation currently uses one interaction stack in `Hero.tsx` + `WebGLSlab.tsx`: Lenis + ScrollTrigger normalize the scroll timeline, `Hero.tsx` keeps the DOM/narrative state in a unified rAF loop, and `WebGLSlab.tsx` reads the derived `SceneState` for a fixed WebGL object and camera narrative. There is no active rigid-body room, gravity, collision, or Rapier runtime.

| Package                  | Status      | Intended role                                                       |
| ------------------------ | ----------- | ------------------------------------------------------------------- |
| `lenis`                  | Implemented | Smooth scroll input and normalized wheel/touch momentum             |
| `gsap` + `ScrollTrigger` | Implemented | Scroll progress source, section triggers, and timeline coordination |
| `motion`                 | Implemented | Narrative section presence primitives                               |
| `zustand`                | Implemented | Shared pointer, viewport, and scene-mode state                      |

Current code still keeps the per-frame DOM/pointer writes in a custom rAF loop so one owner coordinates copy presence, title counter-parallax, and WebGL state. The WebGL object is fixed in world space; scroll moves the camera orbit/dolly path and material response rather than a physics room.

`InteractionState` in `src/lib/interaction.ts` describes the future shared source state shape. `SceneState` is the current WebGL render state passed from `Hero.tsx` to `WebGLSlab.tsx`; it stores damped scroll progress, stage index, eased stage progress, and scroll velocity. `deriveRecursiveFossilMaterialState` maps that render state into material parameters for the GLB monolith.

---

## Commands

```bash
npm run dev        # Next.js dev server → http://localhost:3000
npm test           # Node test runner → interaction helper regression tests
npm run typecheck  # TypeScript strict check
npm run lint       # TypeScript noEmit check (no dedicated ESLint config in this repo)
npm run build      # Static export build → ./out/
npm run start      # Serve the built output
```

---

## Current architecture

The page is a `500svh` long-scroll surface. The WebGL canvas stays fixed at `100svh`; raw scrolling drives narrative section presence, while a damped visual scroll value updates a mutable `sceneStateRef` for the R3F object. This avoids creating a fixed-position containing block bug where the canvas itself appears to fall during scroll, and keeps the WebGL narrative from feeling locked to the scrollbar.

There is one WebGL focal object: a GLB recursive monolith loaded from `public/models/black-layered-prism.optimized.glb`. It is intentionally not a thin slab, ring, through-hole, physics body, or room-bound object. Its camera pose and material response are stage-aware. The camera now combines orbit, dolly distance, height, look-at drift, and roll through `src/lib/cameraMotion.ts`, so scrolling feels like moving around and toward the artifact rather than sliding along a flat rail. The current direction is **Dream Valley Interface / Recursive Fossil**: a dark interface artifact whose surface appears compressed, engraved, mirrored, and stabilized by scroll. The page chrome and narrative layer use the `#142334` + `#baccd9` two-tone contrast system; the WebGL monolith keeps its existing fossil material palette unless a separate WebGL material pass is approved.

| Stage | HTML narrative  | WebGL expression                                        |
| ----- | --------------- | ------------------------------------------------------- |
| 观察  | Centered thesis | Baseline camera pose + low threshold, mostly silhouette |
| 因果  | 左侧重心        | Camera rail shifts; engraved causal traces increase     |
| 递归  | 右侧重心        | Surface feedback and compression become visible         |
| 自指  | 中央收束        | Mirror-like traces and self-reference bands intensify   |
| 重构  | 下左收束        | Compression recedes; signal stabilizes into an artifact |

The page keeps the DOM simple: brand/meta, fixed WebGL wrapper, mapped narrative sections, and a short scene-ready preloader. Once fonts and the GLB mount are ready, the preloader fades while the WebGL shell eases from slight blur/dim/scale into the final scene; copy entrance is delayed so the transition is a handoff instead of a hard cut. The site background is CSS-owned by `app/globals.css`; `WebGLSlab.tsx` renders a transparent R3F scene with the recursive monolith object (`SlabMesh`, despite the legacy component name).

---

## Design language

Documented in full in `DESIGN.md`. Core philosophy:

- **architectural** — spatial composition, WebGL object as the sole focal subject
- **restrained** — two-color low-saturation contrast, no decoration for decoration's sake
- **quiet luxury** — deep blue page ground, pale UI signal light, editorial serif typography
- **single focal object** — everything orbits the recursive monolith; no competing elements
- **stage-aware layout** — each viewport changes copy alignment, camera posture, and material response
- **spatial composition** — perspective depth, layered parallax, atmospheric void behind

See `DESIGN.md` for color tokens, typography system, animation philosophy, and mobile strategy.

---

## Development notes for agents

See `AGENTS.md` for:

- Project conventions and coding style
- Current interaction ownership model
- Tailwind v4 `@theme` usage
- R3F pattern (single Canvas, camera narrative, handlers outside Canvas)
- Mobile performance strategy
- What NOT to change when optimizing

---

## Customization

| What                         | Where                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Chinese section copy         | `src/content/homepage.ts`                                                                                  |
| CTA label / href             | `src/content/homepage.ts`                                                                                  |
| Brand mark / meta            | `src/components/Hero.tsx`                                                                                  |
| Two-tone page chrome palette | `app/globals.css` → `@theme` block                                                                         |
| Narrative stage layout       | `app/globals.css` → `.narrative-section--*`                                                                |
| Scroll stage model           | `src/lib/interaction.ts`                                                                                   |
| WebGL camera path            | `src/lib/cameraMotion.ts` → `sampleNarrativeCameraPose()`                                                  |
| Recursive monolith model     | `public/models/black-layered-prism.optimized.glb`                                                          |
| Model generation scripts     | `scripts/generate-monolith.mjs`, `scripts/generate-monolith.blender.py`, `scripts/run-blender-monolith.sh` |
| Recursive fossil state       | `src/lib/interaction.ts` → `deriveRecursiveFossilMaterialState`                                            |
| Material effects             | `src/components/WebGLSlab.tsx` → `installRecursiveFossilShader` / `onBeforeCompile` uniforms               |
| Scene ready gate             | `src/components/Hero.tsx` + `WebGLSlab.tsx` `onSceneReady`                                                 |
| Intro reveal timing          | `src/lib/introReveal.ts`                                                                                   |

## Documentation status

- `docs/CODE_DOC_ALIGNMENT.md` is the current implementation alignment note for this iteration.
- `docs/superpowers/specs/2026-06-04-recursive-intelligence-homepage-design.md` and `docs/superpowers/plans/2026-06-04-recursive-intelligence-homepage.md` are historical Superpowers artifacts from the first homepage conversion. They preserve design lineage, but the current source of truth is the shipped Chinese long-scroll implementation plus `README.md`, `DESIGN.md`, and `docs/NEXT_STEPS.md`.
