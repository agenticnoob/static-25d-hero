# Handoff - Spatial 2.5D Hero

## Current State

- Repository: `/Users/ai/projects/static-25d-hero`
- Branch: `main`
- Remote: `origin/main`
- This handoff covers the scroll/animation tuning pass and the documented target motion stack.

The page is a single long-scroll spatial homepage. It uses a fixed full-viewport WebGL canvas and scroll-driven narrative sections. The canvas wrapper must remain fixed to the viewport; scroll movement is expressed inside the R3F scene through scene state, not by moving the canvas DOM wrapper.

## Target Direction From Owner

The next optimization should move from the current custom rAF/ref-based interaction model toward a product-page motion stack:

- Next.js App Router + React + TypeScript remain the base.
- Tailwind CSS v4 remains the design-system layer.
- Three.js / `@react-three/fiber` / `@react-three/drei` remain the WebGL layer.
- Add `@react-three/rapier` for restrained rigid-body collision, inertia, and physical settling.
- Add Lenis for smooth scroll input and normalized velocity.
- Add GSAP ScrollTrigger for scroll-driven `pin`, `scrub`, progress, and section transitions.
- Add Motion for UI micro-interactions: text entrance, CTA hover, small layout movement.
- Add Zustand for shared `scrollProgress`, `scrollVelocity`, `mouse`, `viewport`, and `sceneMode`.

Important: only `drei` is currently installed from that target stack. Rapier, Lenis, GSAP, Motion, and Zustand are documented as planned dependencies until installed and wired.

## Recent Work Completed

### 1. Fixed Canvas Scroll Behavior

The fixed canvas wrapper had appeared to drift with page scroll. The fix keeps the wrapper viewport-fixed and moves only the WebGL slab inside the scene.

Important rule:

```tsx
className="fixed inset-0 z-[5] h-[100svh] w-screen overflow-hidden pointer-events-none"
```

Do not add scroll-driven `transform`, `top`, `bottom`, `filter`, or perspective effects to this wrapper or its fixed-position ancestors.

### 2. Removed Weak Secondary WebGL Elements

The ground perspective plane and the low-visibility void particle field were removed. The WebGL scene now keeps a single focal object: the slab.

### 3. Brighter Slab Material

The slab material was changed from dark blue-black to grey-white so it reads brighter than the obsidian background. Stage shader effects were also moved toward warm grey / off-white tones.

### 4. Stage-Aware Narrative Iteration

The narrative uses stage-specific layout and scroll presence:

- `NarrativeSection` now receives stage-specific layout classes.
- Each scroll stage has distinct editorial posture:
  - observation: centered opening
  - causality: left-weighted
  - recursion: right-weighted
  - selfReference: narrow centered
  - reconstruction: lower-left closing posture
- inactive sections are fully hidden from visual overlap.
- mobile layouts are recentred and hardened.

### 5. Scroll And Animation Tuning

The scroll model was changed after the user reported that the interaction felt stiff:

- Raw scroll progress drives narrative visibility.
- A damped visual scroll value drives WebGL stage progress.
- Stage progress includes short hold regions so poses can settle.
- Narrative sections use sticky inner content and varied `svh` lengths.
- CSS transitions were removed from `.narrative-section-inner` for `opacity`, `filter`, and `transform` because those values are written by the rAF loop.
- Scroll velocity now feeds a restrained slab pitch/yaw/scale/brightness response.

### 6. Stronger WebGL Stage Expression

`WebGLSlab.tsx` now gives each narrative stage a more visible shader/pose difference while preserving one single focal slab.

- causality: stronger trace/network lines
- recursion: loop/ring motifs
- selfReference: mirror/lens line
- reconstruction: denser node-link structure
- slab position, pitch, yaw, roll, scale, and shader uniforms follow stage state

### 7. Documentation Sync

`README.md`, `DESIGN.md`, and this handoff were updated to match the current architecture, stage system, canvas sizing rule, reduced-motion expectations, and target motion stack.

### 8. Chinese Visual QA And Mobile Reconstruction Fix

A browser QA pass was completed at desktop and 360px mobile widths. The WebGL canvas wrapper stayed fixed, all five stages activated in order, and no horizontal overflow was observed.

The mobile reconstruction stage had one visual issue: the final copy and CTA sat too close to the bright slab region. `app/globals.css` now moves only the mobile reconstruction copy to the upper third of the viewport, leaving the slab as the single lower focal object.

## Key Files

- `app/page.tsx` - renders `<Hero />`
- `app/layout.tsx` - root layout and global CSS import
- `app/globals.css` - Tailwind v4 theme tokens, narrative layout CSS, responsive rules
- `src/components/Hero.tsx` - long-scroll controller, section activation, pointer/scroll state
- `src/components/NarrativeSection.tsx` - stage-aware narrative DOM section
- `src/components/WebGLSlab.tsx` - R3F canvas, fixed background, slab shader, stage poses
- `src/content/homepage.ts` - homepage copy and stage metadata
- `README.md` - project overview
- `DESIGN.md` - design language and implementation constraints

## Hard Constraints

- Use Chinese when talking with the owner.
- Aesthetic: restrained, premium, quiet luxury, architectural, high contrast, generous negative space, low saturation.
- Keep a single focal WebGL slab. Do not add competing hero objects.
- Typeface should remain Georgia. Do not switch to Inter/Roboto/system UI.
- Palette identity: obsidian + warm off-white. Do not change it broadly without asking.
- Tailwind is v4 via `@theme` in `app/globals.css`. Do not add `tailwind.config.js`.
- No cheap bounce, elastic, or decorative overshoot. Rapier/Motion springs are allowed only when damped and physically restrained.
- CTA hover should remain pure CSS. Do not add React hover handlers for it.
- Do not move WebGL canvas DOM wrapper during scroll.
- WebGL elements must participate in the narrative. Do not add decorative particles, neon effects, flashing, or crowded cyberpunk visuals.

## Verification Commands

Run these before commit/push:

```bash
npx tsc --noEmit
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
- slab remains the only focal object
- mobile viewport has no horizontal overflow
- reduced motion keeps content readable and avoids heavy motion

Useful scroll checkpoints:

- top: observation
- around 25%: causality
- around 50%: recursion
- around 75%: selfReference
- bottom: reconstruction

## Git Notes

Pushing over normal SSH port 22 failed previously. Use SSH over 443:

```bash
GIT_SSH_COMMAND='ssh -p 443 -o HostName=ssh.github.com' git push origin main
```

`gh auth status` previously showed an invalid token, so do not rely on GitHub CLI auth unless revalidated.

## Suggested Next Iteration

The immediate next step is narrative rhythm: quiet inactive sections further and keep each viewport focused on one clear idea. After that, make the next interaction iteration architectural rather than tiny parameter tuning:

1. Introduce the shared interaction store.
   - Install and wire Zustand.
   - Store `scrollProgress`, `scrollVelocity`, `mouse`, `viewport`, and `sceneMode`.
   - Keep DOM and R3F reading from the same semantic state.

2. Replace custom scroll timing with Lenis + ScrollTrigger.
   - Lenis owns smooth input and velocity.
   - ScrollTrigger owns pin/scrub/progress/section transition.
   - Do not animate the same transform through CSS, rAF, GSAP, and Motion simultaneously.

3. Rebuild slab motion around Rapier.
   - Add a restrained rigid-body layer for the slab.
   - Use mass, damping, and invisible constraints for inertia.
   - Avoid game-like collision, bounce, or flipping.

4. Use Motion for UI-only polish.
   - Text entrance.
   - CTA hover or press if the CTA pure-CSS constraint is intentionally changed later.
   - Small glass/line panel transitions if introduced.

5. Refine visual depth.
   - Maintain foreground narrative copy, midground interactive slab, background atmospheric field.
   - Use soft glass, fine borders, gradients, and shadows only when they clarify hierarchy.

6. Add final browser verification evidence.
   - Desktop and mobile screenshots.
   - DOM geometry check for fixed canvas.
   - Build output summary.

## Last Known Good Verification

Before committing this handoff:

- `npx tsc --noEmit` passed
- `git diff --check` passed
- `npm run build` passed when rerun outside the sandbox. In the default sandbox, Turbopack failed because it attempted to create a process / bind a port.

Browser visual QA still needs to be repeated after the target motion-stack migration.
