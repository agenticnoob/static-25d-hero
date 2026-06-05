# Handoff - Spatial 2.5D Hero

## Current State

- Repository: `/Users/ai/projects/static-25d-hero`
- Branch: `main`
- Remote: `origin/main`
- Current visual direction: fixed recursive stela object, camera-driven WebGL narrative, no physics room.

The page is a single long-scroll spatial homepage. It uses a fixed full-viewport WebGL canvas and scroll-driven narrative sections. The canvas wrapper must remain fixed to the viewport; scroll movement is expressed inside the R3F scene through camera rail state and material response, not by moving the canvas DOM wrapper.

## Current WebGL Direction

The active WebGL scene contains one focal object:

- a thick recursive stela, not a thin slab;
- dark obsidian / graphite material;
- no through-hole, torus, ring, rigid body, collision room, or gravity;
- front-surface inset panels and shallow engraved recursive paths;
- a stage-aware camera rail that tells the narrative by changing viewpoint.

The goal is to make the object read first as a believable physical artifact. Philosophy, AI, recursion, and self-reference should appear as secondary structure: depth, engraving, repeated insets, and camera reveal.

## Recent Work Completed

### 1. Removed Physics Room Runtime

`WebGLSlab.tsx` no longer renders a Rapier `Physics` tree, `RigidBody`, `Collider`, room bounds, gravity, bounce, random impulse, or collision response. The object is fixed in world space.

`@react-three/rapier` has been removed from project dependencies because it is not part of the current runtime.

### 2. Replaced Literal Slab / Ring Direction

The previous shape experiments were too easy to read as a ring, broken ring, double ring, or cube with a hole. The current geometry avoids those silhouettes:

- `createRecursiveCoreGeometry()` builds a thick irregular extruded stela body.
- `STELA_INSET_PANELS` adds dark stepped recesses on the front face.
- `STELA_RIDGE_PANELS` adds raised architectural edges.
- `STELA_LINE_PATHS` adds shallow recursive engraving.

The file name `WebGLSlab.tsx` and component name `SlabMesh` are legacy names. They can be renamed later, but the runtime object is now the recursive stela.

### 3. Camera Narrative

The WebGL story is now told through `CAMERA_RAIL_DESKTOP` and `CAMERA_RAIL_COMPACT`.

`Hero.tsx` still owns the unified rAF loop and writes:

- pointer target to `coreInteractionRef`;
- raw and damped scroll state to `sceneStateRef`;
- narrative presence and title counter-parallax.

`WebGLSlab.tsx` reads those refs in R3F `useFrame` and applies:

- stage-aware camera position/look-at/roll;
- tiny pointer parallax;
- restrained material response through `uMouse`, `uInertia`, and `uImpact`.

### 4. Documentation Sync

`README.md`, `PRODUCT.md`, `DESIGN.md`, `docs/HANDOFF.md`, `docs/NEXT_STEPS.md`, and `docs/CODE_DOC_ALIGNMENT.md` have been updated to remove stale room/physics/Rapier/slab claims.

## Key Files

- `app/page.tsx` - renders `<Hero />`
- `app/layout.tsx` - root layout and global CSS import
- `app/globals.css` - Tailwind v4 theme tokens, narrative layout CSS, responsive rules
- `src/components/Hero.tsx` - long-scroll controller, section activation, pointer/scroll state
- `src/components/NarrativeSection.tsx` - stage-aware narrative DOM section
- `src/components/WebGLSlab.tsx` - R3F canvas, fixed background, recursive stela, camera rail
- `src/content/homepage.ts` - homepage copy and stage metadata
- `README.md` - project overview
- `DESIGN.md` - design language and implementation constraints

## Hard Constraints

- Use Chinese when talking with the owner.
- Aesthetic: restrained, premium, quiet luxury, architectural, high contrast, generous negative space, low saturation.
- Keep a single focal WebGL object. Do not add competing hero objects.
- The object should remain a believable artifact before it becomes a symbol.
- Typeface should remain Georgia. Do not switch to Inter/Roboto/system UI.
- Palette identity: obsidian + warm off-white. Do not change it broadly without asking.
- Tailwind is v4 via `@theme` in `app/globals.css`. Do not add `tailwind.config.js`.
- No cheap bounce, elastic, decorative overshoot, rigid-body spectacle, room cage, or collision toy.
- CTA hover should remain pure CSS. Do not add React hover handlers for it.
- Do not move WebGL canvas DOM wrapper during scroll.

## Verification Commands

Run these before commit/push:

```bash
npm run typecheck
npm test
git diff --check
npm run build
```

Notes:

- `npm run build` may need elevated execution in the Codex sandbox because Next/Turbopack can require process capabilities outside the default sandbox.
- Next may mutate `next-env.d.ts` between `.next/types/routes.d.ts` and `.next/dev/types/routes.d.ts`. Treat that as generated noise unless intentionally changing Next typing behavior.

## Browser QA Checklist

Use `http://localhost:3000`, not `127.0.0.1`.

Check:

- canvas wrapper stays fixed at viewport top while scrolling
- no black strip appears above canvas at page bottom
- all five narrative stages become active in sequence
- inactive sections do not overlap active copy
- recursive stela remains the only focal object
- object does not read as a ring, cube with a hole, or thin slab
- mobile viewport has no horizontal overflow
- reduced motion keeps content readable and avoids heavy motion

## Git Notes

Pushing over normal SSH port 22 failed previously. Use SSH over 443 if needed:

```bash
GIT_SSH_COMMAND='ssh -p 443 -o HostName=ssh.github.com' git push origin main
```

`gh auth status` previously showed an invalid token, so do not rely on GitHub CLI auth unless revalidated.

## Suggested Next Iteration

1. Visual QA the recursive stela on desktop and 360px mobile.
2. Tune the stela proportions if it reads too flat, too decorative, or too much like a literal monument.
3. Rename legacy `WebGLSlab.tsx` / `SlabMesh` identifiers only if the rename can be done cleanly with focused tests.
4. Refine material depth: more graphite/obsidian mass, fewer bright trace lines, more believable edge wear.
5. Keep the architecture stable: one interaction loop, one WebGL scene, one focal object.
