# Spatial — 递归智能界面

一个中文为主、保留一句英文 thesis 的空间化 AI-native 个人主页。页面不是简历站，也不是项目索引；它用长滚动、固定 WebGL 画布、惯性和短句叙事表达五个阶段：观察、因果、递归、自指、重构。

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
│   └── WebGLSlab.tsx     # Single R3F Canvas: fixed background + recursive stela object
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

| Package | Version | Role |
|---------|---------|------|
| `next` | 16.2.7 | App router, SSR/SSG |
| `react` / `react-dom` | 19.2.7 | UI |
| `tailwindcss` | 4.3.0 | Utility CSS via `@theme` directive |
| `@tailwindcss/postcss` | 4.3.0 | Tailwind v4 PostCSS integration |
| `three` | 0.184.0 | Raw Three.js (geometry, materials, shaders) |
| `@react-three/fiber` | 9.6.1 | React renderer for Three.js |
| `@react-three/drei` | 10.7.7 | Installed R3F helpers; currently unused by the active scene |
| `typescript` | 5.9.3 | Strict type checking |

No UI kit. Tailwind v4 remains the design-system layer.

### Interaction stack status

The implementation currently uses one interaction stack in `Hero.tsx` + `WebGLSlab.tsx`: Lenis + ScrollTrigger normalize the scroll timeline, `Hero.tsx` keeps the DOM/narrative state in a unified rAF loop, and `WebGLSlab.tsx` reads the derived `SceneState` for a fixed WebGL object and camera narrative. There is no active rigid-body room, gravity, collision, or Rapier runtime.

| Package | Status | Intended role |
|---------|--------|---------------|
| `lenis` | Implemented | Smooth scroll input and normalized wheel/touch momentum |
| `gsap` + `ScrollTrigger` | Implemented | Scroll progress source, section triggers, and timeline coordination |
| `motion` | Implemented | Narrative section presence primitives |
| `zustand` | Implemented | Shared pointer, viewport, and scene-mode state |

Current code still keeps the per-frame DOM/pointer writes in a custom rAF loop so one owner coordinates copy presence, title counter-parallax, and WebGL state. The WebGL object is fixed in world space; scroll moves the camera rail and material response rather than a physics room.

`InteractionState` in `src/lib/interaction.ts` describes the future shared source state shape. `SceneState` is the current WebGL render state passed from `Hero.tsx` to `WebGLSlab.tsx`; it stores damped scroll progress, stage index, eased stage progress, and scroll velocity.

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

There is one WebGL focal object: a thick recursive stela, built from a dark monolithic core, inset panels, ridges, and shallow engraved line paths. It is intentionally not a thin slab, ring, through-hole, physics body, or room-bound object. Its camera pose and material response are stage-aware:

| Stage | HTML narrative | WebGL expression |
|-------|----------------|------------------|
| 观察 | Centered thesis | Baseline camera pose + low-contrast observation sweep |
| 因果 | 左侧重心 | Camera rail shifts to expose depth and side mass |
| 递归 | 右侧重心 | Inset panels and engraved paths become the conceptual layer |
| 自指 | 中央收束 | Camera closes in; mirror-like material traces stay restrained |
| 重构 | 下左收束 | Camera returns to a stable architectural read |

The page keeps the DOM simple: brand/meta, fixed WebGL wrapper, and mapped narrative sections. Background and recursive stela rendering live in one `WebGLSlab.tsx` scene (`BgQuad` + `SlabMesh`, despite the legacy component name).

---

## Design language

Documented in full in `DESIGN.md`. Core philosophy:

- **architectural** — spatial composition, isometric WebGL object as the sole focal subject
- **restrained** — one accent color family (blue-gray), no decoration for decoration's sake
- **quiet luxury** — low-saturation palette, editorial serif typography, generous negative space
- **single focal object** — everything orbits the recursive stela; no competing elements
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

| What | Where |
|------|-------|
| Chinese section copy | `src/content/homepage.ts` |
| CTA label / href | `src/content/homepage.ts` |
| Brand mark / meta | `src/components/Hero.tsx` |
| Obsidian palette | `app/globals.css` → `@theme` block |
| Narrative stage layout | `app/globals.css` → `.narrative-section--*` |
| Scroll stage model | `src/lib/interaction.ts` |
| WebGL camera rail | `src/components/WebGLSlab.tsx` → `CAMERA_RAIL_*` |
| Recursive stela geometry | `src/components/WebGLSlab.tsx` → `createRecursiveCoreGeometry`, `STELA_*` |
| Shader effects | `src/components/WebGLSlab.tsx` → `slabFrag`（基于 `uInertia`、`uImpact`、`uMouse`） |

## Documentation status

- `docs/CODE_DOC_ALIGNMENT.md` is the current implementation alignment note for this iteration.
- `docs/superpowers/specs/2026-06-04-recursive-intelligence-homepage-design.md` and `docs/superpowers/plans/2026-06-04-recursive-intelligence-homepage.md` are historical Superpowers artifacts from the first homepage conversion. They preserve design lineage, but the current source of truth is the shipped Chinese long-scroll implementation plus `README.md`, `DESIGN.md`, and `docs/NEXT_STEPS.md`.
