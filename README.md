# Spatial — 递归智能界面

一个中文、空间化的 AI-native 个人主页。页面不是简历站，也不是项目索引；它用长滚动、固定 WebGL 画布、惯性和短句叙事表达五个阶段：观察、因果、递归、自指、重构。

Tech stack: **Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Three.js / @react-three/fiber**

---

## Project layout

```
static-25d-hero/
├── app/
│   ├── globals.css       # Tailwind v4 @theme, narrative layout, CTA, responsive rules
│   ├── layout.tsx        # Chinese metadata, dark root layout
│   └── page.tsx          # Renders the homepage
├── src/components/
│   ├── Hero.tsx          # Unified rAF loop, scroll stage state, fixed canvas wrapper
│   ├── NarrativeSection.tsx # Five sparse Chinese narrative stages
│   └── WebGLSlab.tsx     # Single R3F Canvas: fixed background + stage-aware slab
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

### Target interaction stack

The next optimization phase should add the interaction libraries below deliberately, not as decoration:

| Package | Status | Intended role |
|---------|--------|---------------|
| `@react-three/rapier` | Planned | WebGL rigid bodies, collision, inertia, restrained physical settling |
| `lenis` | Planned | Smooth scroll source of truth, normalized wheel/touch momentum |
| `gsap` + `ScrollTrigger` | Planned | Scroll timelines: pin, scrub, progress, section transitions |
| `motion` | Planned | UI micro-interactions: entrance, hover, layout transitions |
| `zustand` | Planned | Shared scroll/mouse/viewport/scene-mode state across DOM and R3F |

Current code still uses a custom rAF loop and mutable refs for scroll and pointer state. Do not document the planned stack as implemented until dependencies are installed and the architecture is migrated.

`InteractionState` in `src/lib/interaction.ts` describes the future shared source state shape. `SceneState` is the current WebGL render state passed from `Hero.tsx` to `WebGLSlab.tsx`; it stores damped scroll progress, stage index, eased stage progress, and scroll velocity.

---

## Commands

```bash
npm run dev      # Next.js dev server → http://localhost:3000
npm test         # Node test runner → interaction helper regression tests
npm run typecheck # TypeScript strict check
npm run lint     # TypeScript static check; no separate ESLint config yet
npm run build    # TypeScript check + static build → ./out/
npm run start    # Serve the built output
```

---

## Current architecture

The page is a `500svh` long-scroll surface. The WebGL canvas stays fixed at `100svh`; raw scrolling drives narrative section presence, while a damped visual scroll value updates a mutable `sceneStateRef` for the R3F slab. This avoids creating a fixed-position containing block bug where the canvas itself appears to fall during scroll, and keeps the slab motion from feeling locked to the scrollbar.

There is one WebGL focal object: the slab. Its shader and pose are stage-aware:

| Stage | HTML narrative | WebGL expression |
|-------|----------------|------------------|
| 观察 | Centered thesis | Stable slab, quiet room |
| 因果 | Left-weighted copy | Low-contrast trace lines and nodes |
| 递归 | Right-weighted copy | Slow loop light paths |
| 自指 | Narrow centered copy | Mirror line and self-reference echo |
| 重构 | Lower-left final section | Small network re-layout on the slab |

The page keeps the DOM simple: brand/meta, fixed WebGL wrapper, and mapped narrative sections. Background and slab rendering live in `WebGLSlab.tsx`.

## Optimization plan

1. **State layer:** introduce a small Zustand store for `scrollProgress`, `scrollVelocity`, `mouse`, `viewport`, and `sceneMode`. `Hero.tsx` and `WebGLSlab.tsx` should read the same state instead of exchanging ad hoc mutable refs.
2. **Scroll layer:** replace direct `window.scrollY` sampling with Lenis. Lenis should drive normalized progress and velocity, while respecting reduced motion and native browser accessibility.
3. **Timeline layer:** use GSAP ScrollTrigger for section pinning, scrubbed progress, and stage transitions. ScrollTrigger owns narrative timing; it should write semantic progress into Zustand, not directly mutate every component.
4. **Physics layer:** wrap the slab or its internal interaction body with `@react-three/rapier`. Use rigid-body inertia and collision only where it supports the story. No bouncing spectacle, no game-like flipping.
5. **UI motion layer:** use Motion for text entrance, CTA feedback, and small layout transitions. Do not animate scroll-driven text with both JS frame writes and CSS transitions on the same properties.
6. **Visual composition:** keep foreground narrative copy, midground interactive WebGL slab, and background atmospheric field clearly separated. The slab remains the single narrative object, not a decorative prop.

---

## Design language

Documented in full in `DESIGN.md`. Core philosophy:

- **architectural** — spatial composition, isometric WebGL object as the sole focal subject
- **restrained** — one accent color family (blue-gray), no decoration for decoration's sake
- **quiet luxury** — low-saturation palette, editorial serif typography, generous negative space
- **single focal object** — everything orbits the slab; no competing elements
- **stage-aware layout** — each viewport changes copy alignment and slab behavior
- **spatial composition** — perspective depth, layered parallax, atmospheric void behind

See `DESIGN.md` for color tokens, typography system, animation philosophy, and mobile strategy.

---

## Development notes for agents

See `AGENTS.md` for:

- Project conventions and coding style
- Parallax physics model (inertia + gravity)
- Tailwind v4 `@theme` usage
- R3F pattern (physics in `useFrame`, handlers outside Canvas)
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
| Slab physics constants | `src/components/WebGLSlab.tsx` → `PHYS` |
| Stage-specific slab pose | `src/components/WebGLSlab.tsx` → `STAGE_POSES` |
| Shader stage effects | `src/components/WebGLSlab.tsx` → `slabFrag` |

## Documentation status

- `docs/CODE_DOC_ALIGNMENT.md` is the current implementation alignment note for this iteration.
- `docs/superpowers/specs/2026-06-04-recursive-intelligence-homepage-design.md` and `docs/superpowers/plans/2026-06-04-recursive-intelligence-homepage.md` are historical Superpowers artifacts from the first homepage conversion. They preserve design lineage, but the current source of truth is the shipped Chinese long-scroll implementation plus `README.md`, `DESIGN.md`, and `docs/NEXT_STEPS.md`.
