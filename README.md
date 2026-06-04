# Static 2.5D Hero — Spatial

**Spatial interfaces for agentic systems.** A cinematic, architectural landing hero page. Single focal object, restrained palette, editorial typography, WebGL depth.

Tech stack: **Next.js 16 · React 19 · Tailwind CSS v4 · Three.js / @react-three/fiber**

---

## Project layout

```
static-25d-hero/
├── app/
│   ├── globals.css       # Tailwind v4 @theme, obsidian palette, CTA styles
│   ├── layout.tsx       # Root layout: dark mode, meta, viewport
│   └── page.tsx         # Imports Hero, exports default page
├── src/components/
│   ├── Hero.tsx          # Parallax rAF loop, entrance animation, layout
│   ├── WebGLSlab.tsx    # R3F Canvas: slab mesh + ground plane, physics
│   └── VoidField.tsx    # 2D canvas particle field (ambient)
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

## Design language

Documented in full in `DESIGN.md`. Core philosophy:

- **architectural** — spatial composition, isometric WebGL object as the sole focal subject
- **restrained** — one accent color family (blue-gray), no decoration for decoration's sake
- **quiet luxury** — low-saturation palette, editorial serif typography, generous negative space
- **single focal object** — everything orbits the slab; no competing elements
- **editorial layout** — centered copy, top-left brand mark, top-right meta, no footer clutter
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
| Headline / subtitle copy | `Hero.tsx` → `<h1>`, `<p className="subtitle">` |
| CTA label / href | `Hero.tsx` → `<a className="cta-link">` |
| Brand mark text | `Hero.tsx` → `<header className="brand">` |
| Obsidian palette | `app/globals.css` → `@theme` block |
| Parallax amplitudes | `Hero.tsx` → constants `BG_TX/TY`, `TITLE_TX/TY` |
| Physics constants | `WebGLSlab.tsx` → `PHYS` object |
| VoidField particle count | `VoidField.tsx` → `PARTICLE_COUNT` |
