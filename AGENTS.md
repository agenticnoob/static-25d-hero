# Agent Notes — Working on `static-25d-hero`

## Project identity

- **Name:** Spatial 2.5D Hero
- **Repo:** `/Users/ai/projects/static-25d-hero`
- **Current version:** 0.2.0
- **Owner:** noobli

## Key people

- **noobli** — preference: Chinese for conversation. Aesthetic: architectural, restrained, premium, quiet luxury, single focal object, negative space, low saturation, editorial layout, spatial composition.

## Tech stack

```
Next.js 16.2.7  (App Router, SSG)
React 19.2.7
Tailwind CSS v4.3.0  (via @theme directive — NOT v3 utilities)
Three.js 0.184.0
@react-three/fiber 9.6.1
@react-three/drei 10.7.7  (installed, not currently used by the scene)
TypeScript 5.9.3 (strict)
```

**Key constraint:** Tailwind v4 — theme is defined via `@theme { }` in `globals.css`. There is no `tailwind.config.js`. Adding v3-style utility overrides here will conflict.

---

## Architecture overview

The page is a single `Hero` component rendering:

1. **CSS page ground** — `app/globals.css` owns the `#142334` + `#baccd9` page chrome and soft reveal styles.
2. **WebGL monolith** — `WebGLSlab.tsx` (transparent R3F Canvas), with `SlabMesh` as the legacy component name for the single GLB recursive fossil monolith.
3. **Narrative copy** — HTML/CSS sections from `NarrativeSection.tsx`, `z-20`, five Chinese stages.

All WebGL content lives in a single Three.js Canvas. The DOM only contains the editorial copy.

There is no active `VoidField3D`, `GroundPlane`, or `.hero-copy` structure in the current page. `src/components/VoidField.tsx` is legacy unused code and must not be treated as part of the active scene unless it is deliberately reintroduced with matching docs.

---

## File roles

### `Hero.tsx`

- Owns `coreInteractionRef` (a mutable ref object containing `{ pos, vel, target, active }`)
- Passes `coreInteractionRef` to `WebGLSlab` as a prop
- **Single unified rAF loop** (NOT multiple `useEffect`) that:
  1. Reads `mouseRef` (from `pointermove` / `touchmove`) → lerps to `currentRef`
  2. Writes to `coreInteractionRef.current.target` — this drives restrained WebGL pointer parallax
  3. Writes `titleRef.style.transform` — title counter-parallax
  4. Writes narrative section `data-active` and inline presence styles
  5. Writes `sceneStateRef` — scroll-driven WebGL stage state

**Critical architecture decision:** `coreInteractionRef` is owned by `Hero.tsx`. Hero.tsx RAF loop writes `target` every frame from `currentRef` (window-level pointer tracking, no blind spot). Pointer smoothing lives inside `SlabMesh.useFrame` — NOT in Hero.tsx. Do not add a second writer for `pos` / `vel`.

**Important:** The fixed WebGL wrapper never receives scroll-driven transforms. Scroll state is passed through `sceneStateRef`; R3F camera/object transforms inside `WebGLSlab` tell the story.

**Physics state shape:**

```typescript
interface CoreInteractionState {
  pos: THREE.Vector2; // current pointer state (written by SlabMesh.useFrame)
  vel: THREE.Vector2; // velocity (written by SlabMesh.useFrame)
  target: THREE.Vector2; // mouse target (written by Hero.tsx RAF loop)
  active: boolean; // is pointer on page? (set by onMove/onLeave)
}
```

### `WebGLSlab.tsx`

- R3F `Canvas` with transparent background
- **`coreInteractionRef` is received as a prop** from `Hero.tsx` — not created internally
- **`sceneStateRef` is received as a prop** from `Hero.tsx` — this is the damped WebGL render state, not the raw source interaction state.
- `SlabMesh` component inside Canvas: reads `coreInteractionRef` via `useFrame`, smooths pointer state, applies camera parallax and monolith posture
- `SlabMesh` also reads `sceneStateRef` for stage pose, scroll velocity, and shader uniforms
- `src/lib/cameraMotion.ts` owns `sampleNarrativeCameraPose()`, the pure orbit/dolly/target-drift camera sampling function
- **Pointer smoothing lives inside `useFrame` ONLY** — Hero.tsx does not write `pos`/`vel`
- `coreInteractionRef` is typed as `React.MutableRefObject<CoreInteractionState>`

**Important:** `useFrame` can only be called inside `<Canvas>`. Since `coreInteractionRef` is a ref (mutable object), writes from outside Canvas are visible inside `useFrame` immediately.

### `globals.css`

- Tailwind v4 `@theme` block for all design tokens
- Narrative section layout classes, CTA styles, keyframes defined here
- `.webgl-shell` owns the soft scene reveal: slight blur/dim/scale fades into the final camera view after fonts + GLB readiness.

---

## Pointer and camera model

```
Pointer smoothing:
  pointer += (target - pointer) * 0.075

REST_TILT_Y = 0.18 → the monolith's rest pitch

Camera narrative:
  sampleNarrativeCameraPose(scrollProgress, isCompact)
  → position + target + roll

The camera path combines orbit angle, dolly distance, height, look-at drift, and roll.
```

**DO NOT** add mass/inertia models from physics libraries (Rapier, Cannon, etc.) unless explicitly requested. The current model is intentionally simple.

---

## Tailwind v4 notes

```css
@theme {
  --color-obs-deep: #0a0c12;
  --color-ink: #ede9e3;
  /* etc. */
}
```

Usage in JSX: `className="bg-[#0A0C12]"` or reference as CSS vars — custom theme tokens aren't automatically available as utility classes in v4 without a `theme()` function in the class.

**Current pattern:** CSS custom properties defined in `@theme` are used directly in `style={{}}` props or in `globals.css` as `var(--color-xxx)`. Inline styles use literal hex values for clarity.

---

## Mobile performance strategy

| Concern            | Solution                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| DPR                | Cap at `[1, 1]` (disable Retina scaling)                                                                                          |
| MSAA               | Disable `antialias` on mobile                                                                                                     |
| Particles          | 55 → 28                                                                                                                           |
| Touch parallax     | Amplitude halved; title parallax disabled                                                                                         |
| Entrance animation | Skipped on touch (content is immediately readable)                                                                                |
| Tab visibility     | R3F `frameloop` could switch to `"demand"` + `visibilitychange` listener to skip frames when hidden (TODO — currently `"always"`) |
| Canvas reveal      | skipped on touch via `.webgl-shell` override                                                                                      |

---

## What noobli doesn't want

- **No source code modifications** to Hermes/UHF unless explicitly requested — prefer外围配置, wrappers, 调用方式
- **No bounce/overshoot animations** — ease-out-only, `cubic-bezier(0.28, 0.72, 0.18, 1)`
- **No React event handlers on the CTA** — pure CSS hover only
- **No competing focal objects** — the WebGL monolith is the one and only
- **Don't change the palette** without consulting — obsidian + warm off-white is the identity
- **Don't use Inter/Roboto/system-ui** for any text

---

## Common operations

### Run dev server

```bash
cd /Users/ai/projects/static-25d-hero
npm run dev
# → http://localhost:3000
```

### Build

```bash
npm run build
# → ./out/ (static SSG output)
```

### Check TypeScript

```bash
npx tsc --noEmit
```

### Restart dev server (if port 3000 is taken)

```bash
# Kill existing
kill $(lsof -ti:3000)
# Or find PID:
lsof -i:3000
```

---

## Reading the codebase

Start here:

1. `app/layout.tsx` — root, imports globals.css
2. `app/page.tsx` — single line, renders `<Hero />`
3. `app/globals.css` — design tokens, CTA, grid overlay, responsive breakpoints
4. `Hero.tsx` — layout + parallax rAF loop
5. `WebGLSlab.tsx` — WebGL scene + physics
6. `DESIGN.md` — full design language reference
