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
TypeScript 5.9.3 (strict)
```

**Key constraint:** Tailwind v4 — theme is defined via `@theme { }` in `globals.css`. There is no `tailwind.config.js`. Adding v3-style utility overrides here will conflict.

---

## Architecture overview

The page is a single `Hero` component rendering:

1. **Background layer** — `BgQuad` inside Three.js Canvas (NDC fullscreen quad), shader: deep-space gradient + 64px grid + atmospheric glow. Fixed in screen space.
2. **Void particle field** — `VoidField3D` inside Three.js Canvas (Three.js Points), 55 desktop / 28 mobile
3. **WebGL slab** — `WebGLSlab.tsx` (R3F Canvas), with `SlabMesh` (3D box) and `GroundPlane` (perspective planes)
4. **Editorial copy** — HTML/CSS, `z-20`

All WebGL content lives in a single Three.js Canvas. The DOM only contains the editorial copy.

The copy block (`<section className="hero-copy">`) sits **above** the WebGL slab in z-index but the slab's 3D camera space makes it visually "in front" in perspective.

---

## File roles

### `Hero.tsx`

- Owns `slabPhysRef` (a mutable ref object containing `{ pos, vel, target, active }`)
- Passes `slabPhysRef` to `WebGLSlab` as a prop
- **Single unified rAF loop** (NOT multiple `useEffect`) that:
  1. Reads `mouseRef` (from `pointermove` / `touchmove`) → lerps to `currentRef`
  2. Writes to `slabPhysRef.current.target` — this drives WebGL mesh rotation
  3. Writes `titleRef.style.transform` — title counter-parallax
  4. Writes `slabRef.style.transform` — scroll-driven slab CSS parallax

**Critical architecture decision:** `slabPhysRef` is owned by `Hero.tsx`. Hero.tsx RAF loop writes `target` every frame from `currentRef` (window-level pointer tracking, no blind spot). Physics computation (spring-damper on `pos`) lives entirely in `SlabMesh.useFrame` — NOT in Hero.tsx. This eliminates the double-write bug where both Hero.tsx and SlabMesh were independently updating `p.pos` in the same frame with different spring constants.

**Important:** `slabRef` is a **div ref** pointing to the container div of `WebGLSlab`. It receives DOM-level scroll-driven transforms from here. The R3F physics inside `WebGLSlab` (via `slabPhysRef`) handles mouse-driven tilt independently.

**Physics state shape:**
```typescript
interface PhysicsState {
  pos: THREE.Vector2;    // current rotation (written by SlabMesh.useFrame)
  vel: THREE.Vector2;     // velocity (written by SlabMesh.useFrame)
  target: THREE.Vector2;  // mouse target (written by Hero.tsx RAF loop)
  active: boolean;        // is pointer on page? (set by onMove/onLeave)
}
```

### `WebGLSlab.tsx`

- R3F `Canvas` with transparent background
- **`slabPhysRef` is received as a prop** from `Hero.tsx` — not created internally
- **`BgQuad`** component: NDC fullscreen quad (ignores camera). Renders the deep-space gradient + 64px grid + atmospheric glow in a fragment shader. `renderOrder={-1000}`, `depthTest=false`, `frustumCulled=false`.
- **`VoidField3D`** component: Three.js `<points>` with custom shader. 55 desktop / 28 mobile particles, flicker via sin wave. `renderOrder={-500}`.
- `SlabMesh` component inside Canvas: reads `slabPhysRef` via `useFrame`, runs ALL spring-damper physics on `pos`/`vel`, drives mesh rotation
- `GroundPlane` component inside Canvas: updates `uTime` uniform each frame
- **Physics lives inside `useFrame` ONLY** — Hero.tsx does not write `pos`/`vel`
- `physRef` is typed as `React.MutableRefObject<PhysicsState>`

**Important:** `useFrame` can only be called inside `<Canvas>`. Since `slabPhysRef` is a ref (mutable object), writes from outside Canvas are visible inside `useFrame` immediately.

### `VoidField3D` (inside `WebGLSlab.tsx`)

- Three.js `<points>` with custom `ShaderMaterial`
- Replaces the old 2D `VoidField.tsx` — no separate canvas
- 55 particles desktop, 28 mobile
- Each particle has: position (NDC), baseOpacity, size, phase, speed (per-particle attributes)
- Vertex shader: flicker via `sin(uTime * speed * 60 + phase)`, gl_PointSize based on per-particle size × pixelRatio
- Fragment shader: circular soft disc (discard outside radius 0.5), color rgba(180, 215, 255)
- `renderOrder={-500}` (above BgQuad=-1000, below Slab/Ground)

### `globals.css`

- Tailwind v4 `@theme` block for all design tokens
- No component classes — all styling is inline or via `<style>` blocks in Hero.tsx
- CTA styles, keyframes defined here
- Note: background grid/gradient/glow are now in WebGLSlab BgQuad shader, not CSS

---

## Parallax physics model

```
Inertia (spring-damper):
  vel = vel * damping + (target - pos) * spring

  damping = 0.82  → each frame, velocity retains 82% of previous
  spring  = 0.045 → how aggressively it chases the target
  settle  = 0.007 → spring constant when pointer leaves (slower)

Gravity:
  vel.y += 0.004  → applied only when !active (drifting)

REST_TILT_Y = 0.18 → the slab's rest pitch (slight tilt toward viewer)

When pointer leaves:
  1. target → (0, REST_TILT_Y)
  2. Spring pulls pos toward target, damped
  3. Gravity adds a constant downward component to vel.y
  4. Slab drifts down slightly, then settles at REST_TILT_Y
```

**DO NOT** add mass/inertia models from physics libraries (Rapier, Cannon, etc.) unless explicitly requested. The current model is intentionally simple.

---

## Tailwind v4 notes

```css
@theme {
  --color-obs-deep: #0A0C12;
  --color-ink: #EDE9E3;
  /* etc. */
}
```

Usage in JSX: `className="bg-[#0A0C12]"` or reference as CSS vars — custom theme tokens aren't automatically available as utility classes in v4 without a `theme()` function in the class.

**Current pattern:** CSS custom properties defined in `@theme` are used directly in `style={{}}` props or in `globals.css` as `var(--color-xxx)`. Inline styles use literal hex values for clarity.

---

## Mobile performance strategy

| Concern | Solution |
|---------|---------|
| DPR | Cap at `[1, 1]` (disable Retina scaling) |
| MSAA | Disable `antialias` on mobile |
| Particles | 55 → 28 |
| Touch parallax | Amplitude halved; title parallax disabled |
| Entrance animation | Skipped on touch (content is immediately readable) |
| Tab visibility | R3F `frameloop` could switch to `"demand"` + `visibilitychange` listener to skip frames when hidden (TODO — currently `"always"`) |
| Canvas scale | `transform: scale(0.85)` on mobile (smaller viewport, same slab size) |

---

## What noobli doesn't want

- **No source code modifications** to Hermes/UHF unless explicitly requested — prefer外围配置, wrappers, 调用方式
- **No bounce/overshoot animations** — ease-out-only, `cubic-bezier(0.28, 0.72, 0.18, 1)`
- **No React event handlers on the CTA** — pure CSS hover only
- **No competing focal objects** — the WebGL slab is the one and only
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
