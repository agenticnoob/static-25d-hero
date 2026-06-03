# Static 2.5D Hero

A quiet, architectural **2.5D / isometric** landing hero. A single tilted
architectural object — base platform, stepped slabs, floating monolith — sitting
on a fine etched grid, framed by warm dark space and a single editorial copy
block. **Vite + TypeScript + GSAP**, no framework, no backend, no analytics,
no remote CDN.

## ✨ What's in here

- **Single 2.5D focal subject** built with pure CSS `perspective` +
  `transform-style: preserve-3d` (no `three.js`, no WebGL, no model files).
  Three depth layers — a wide plinth, three stepped slabs, and a single
  floating monolith — all sitting on a fine, low-contrast etched grid.
- **Quiet palette.** Warm near-black background, warm-ivory text, a single
  muted accent on the brand mark. Two soft, low-saturation ambient washes
  for atmospheric depth. No neon, no rainbow, no glassmorphism, no glow.
- **Editorial copy block.** Centered title with a light/dark typographic
  split, a single restrained CTA, a tiny corner mark, a tiny date/coordinates
  meta. No HUD, no kbd hints, no status pill, no logo.
- **Pointer parallax** — only four things respond to the mouse (the iso
  object, the two ambient washes, and the copy), each by ≤ 14 px, no
  rotation. Driven by two CSS variables (`--mx`, `--my`) written once per
  rAF tick.
- **Restrained entrance** — iso lifts into place, copy fades in, no bounce,
  no overshoot, total ~1.0 s.
- **`prefers-reduced-motion`** — both CSS animations and the GSAP timeline
  are killed; the page is fully present in its resting state.
- **Mobile-friendly** — viewport clamped, iso scales with `vmin`, copy and
  meta degrade gracefully on narrow screens, no horizontal scroll.

## 🗂 Project layout

```
static-25d-hero/
├── index.html          # the single hero + the iso subject
├── package.json        # all deps live here, only here
├── tsconfig.json       # strict TS
├── vite.config.ts      # Vite config (server, build)
├── src/
│   ├── main.ts         # parallax + entrance (no DOM generation)
│   └── style.css       # 2.5D stage, surfaces, copy, parallax tokens
└── README.md
```

## 📦 Install

Installs **only into the local project directory** — no global installs, no
`PATH` changes, no shell config edits.

```bash
cd static-25d-hero
npm install
```

Everything (`vite`, `typescript`, `gsap`) lands in `./node_modules/`.

## 🚀 Develop

```bash
npm run dev
```

Vite starts a dev server (default: http://127.0.0.1:5173). It will **not**
auto-open a browser. HMR is on, so edits in `src/` reload live.

## 🏗 Build

```bash
npm run build
```

Output goes to `./dist/` as a fully static bundle:

```
dist/
├── index.html
└── assets/
    ├── index-<hash>.css
    └── index-<hash>.js
```

A type check runs before the build (`tsc --noEmit && vite build`), so a
broken `main.ts` will fail the build.

## 🔍 Preview the built bundle

```bash
npm run preview     # serves ./dist/ on http://127.0.0.1:4173
```

## 🌐 Deploy

The build is a single static folder — drop it on any static host.

### Vercel

```bash
npx vercel          # follow prompts; framework: "Vite"
```

Or import the GitHub repo in the Vercel dashboard — Vite is auto-detected,
build command `npm run build`, output `dist`.

### Netlify

```bash
# netlify.toml
[build]
  command   = "npm run build"
  publish   = "dist"
```

```bash
npx netlify deploy --prod
```

Or drag-and-drop the `dist/` folder at https://app.netlify.com/drop.

### GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

Or use the official GitHub Action
[`actions/deploy-pages@v4`](https://github.com/actions/deploy-pages) with the
build output as the `artifact`.

## 🧪 Self-check: did we pollute anything global?

The repository is intentionally isolated. To verify on your own machine:

```bash
# 1. Confirm no global packages were added
ls $(npm config get prefix)/lib/node_modules
#   should NOT contain: vite, typescript, gsap

# 2. Confirm shell configs are unchanged
git diff ~/.zshrc ~/.bashrc ~/.profile
#   no output = no changes

# 3. Confirm we never wrote outside the project
ls -la ~
ls -la /usr/local/lib/node_modules
#   no new top-level files in either

# 4. Confirm everything we use is declared
cat package.json
#   dependencies     : gsap
#   devDependencies  : typescript, vite

# 5. Reproduce the build
rm -rf node_modules dist
npm install
npm run build
```

If any of those checks show changes you didn't expect — that's the canary
for "something wrote outside the project."

## 🎛 Customizing

| Knob                  | Where                                | Effect                                |
|-----------------------|--------------------------------------|---------------------------------------|
| Title / subtitle      | `index.html` (`.title`, `.subtitle`) | Headline copy                         |
| CTA copy / link       | `index.html` (`.cta`)                | Button label + href                   |
| Surface palette       | `src/style.css` (`:root` vars)       | `--bg-0` … `--bg-4`                   |
| Text palette          | `src/style.css` (`:root` vars)       | `--ink` … `--ink-4`                   |
| Iso tilt              | `src/style.css` (`.iso`)             | `rotateX(...) rotateZ(...)`           |
| Iso size              | `src/style.css` (`.stage`)           | `min(64vmin, 640px)`                  |
| Parallax smoothing    | `src/main.ts` (`setupParallax`)      | `smoothing` constant (0.04 – 0.10)    |
| Entrance easing       | `src/main.ts` (`playEntrance`)       | GSAP ease per stage                   |

## 🧱 Dependencies (and why)

| Package       | Where        | Why                                                   |
|---------------|--------------|-------------------------------------------------------|
| `vite`        | devDep       | Dev server + static bundler. ~1 dep, well-known.      |
| `typescript`  | devDep       | Strict typing for `main.ts`. Runs via `tsc --noEmit`. |
| `gsap`        | runtime dep  | Industry-standard timeline engine. ~30 kB gzipped.    |

No CSS framework, no UI kit, no `three.js` — the 2.5D effect is done with
`perspective` + `rotateX/Z` + `translateZ`, which keeps the bundle small
and the page snappy on mobile.

## 📝 License

MIT — do whatever, no warranty.
