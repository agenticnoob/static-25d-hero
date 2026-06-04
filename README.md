# Spatial — 递归智能界面

一个中文、空间化的 AI-native 个人主页。页面不是简历站，也不是项目索引；它用长滚动、固定 WebGL 画布、惯性和短句叙事表达五个阶段：观察、因果、递归、自指、重构。

Tech stack: **Next.js 16 · React 19 · Tailwind CSS v4 · Three.js / @react-three/fiber**

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
│   └── WebGLSlab.tsx     # Single R3F Canvas: background, particles, slab, ground
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
| `typescript` | 5.9.3 | Strict type checking |

No UI kit. No CSS framework. No state management library.

---

## Commands

```bash
npm run dev      # Next.js dev server → http://localhost:3000
npm run build    # TypeScript check + static build → ./out/
npm run start    # Serve the built output
```

---

## Current architecture

The page is a `500svh` long-scroll surface. The WebGL canvas stays fixed at `100svh`; scrolling updates a mutable `sceneStateRef`, and the R3F scene moves only the slab and ground internally. This avoids creating a fixed-position containing block bug where the canvas itself appears to fall during scroll.

There is one WebGL focal object: the slab. Its shader and pose are stage-aware:

| Stage | HTML narrative | WebGL expression |
|-------|----------------|------------------|
| 观察 | Centered thesis | Stable slab, quiet room |
| 因果 | Left-weighted copy | Low-contrast trace lines and nodes |
| 递归 | Right-weighted copy | Slow loop light paths |
| 自指 | Narrow centered copy | Mirror line and self-reference echo |
| 重构 | Lower-left final section | Small network re-layout on the slab |

The page keeps the DOM simple: brand/meta, fixed WebGL wrapper, and mapped narrative sections. All particle/background/slab rendering lives in `WebGLSlab.tsx`.

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
