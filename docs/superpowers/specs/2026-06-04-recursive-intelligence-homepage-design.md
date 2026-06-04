# Recursive Intelligence Homepage Design

> Historical design artifact. This English spec captured the first long-scroll homepage direction. The current implementation is Chinese and is documented by `README.md`, `DESIGN.md`, `docs/NEXT_STEPS.md`, and `docs/CODE_DOC_ALIGNMENT.md`. Keep this file for design lineage; do not treat its English copy examples as the current shipped page copy.

## Purpose

Build a high-end personal homepage that expresses noobli's shift from traditional frontend engineering into AI-native interface thinking.

The site should communicate a philosophy without becoming a philosophy article. The core idea is hidden in structure: observation changes the system, causality unfolds through scroll, recursion appears as feedback motion, self-reference appears once, and reconstruction becomes the final spatial state.

## Design Thesis

**Philosophy hides in structure.**

The visitor should not be asked to read about recursion, AI revolution, or self-reference. Instead, the page should operate like those ideas:

- The pointer observes and perturbs the system.
- Scroll advances a causal chain.
- The WebGL object turns output back into input.
- The page describes a system that changes interfaces while itself behaving like a changed interface.
- The final layout makes room for AI by rebuilding the original spatial structure.

## Existing Baseline

The current project already contains the correct foundation:

- Next.js App Router static page.
- Tailwind v4 via `@theme` in `app/globals.css`.
- One `Hero` component with a unified rAF loop.
- One R3F `Canvas` in `WebGLSlab.tsx`.
- WebGL background quad, particle field, slab mesh, and ground plane.
- Slab physics owned by `SlabMesh.useFrame`, with `Hero.tsx` writing only targets.
- Existing constraints in `DESIGN.md`: obsidian palette, Georgia, single focal object, no bounce, no saturated palette changes, mobile DPR cap.

The new design must build on this architecture, not replace it.

## Recommended Direction

Use one continuous WebGL scene across a longer page. The slab remains the single focal object, but its meaning changes across scroll stages.

The page should feel like a cinematic control plane, not a conventional portfolio. Work and capability content can appear later, but the first iteration focuses on the manifesto structure.

## Page Narrative

### Stage 1: Observation

First viewport. The slab is stable, architectural, and quiet. Pointer movement creates subtle inertial tilt.

Primary copy:

```text
Designing interfaces
for recursive intelligence.
```

Support copy:

```text
Former frontend engineer. Now rebuilding the conditions software is built for.
```

The interaction meaning is simple: the observer changes the system.

### Stage 2: Causality

As the visitor scrolls, the slab shifts downward and the background grid gains depth. A restrained sequence of causal words appears near the spatial object:

```text
tool -> workflow -> organization -> cognition -> world
```

The page should not render this like a loud timeline. It should feel like labels emerging from a spatial instrument.

Primary statement:

```text
Every tool changes the workflow around it.
```

### Stage 3: Recursion

The slab surface begins showing a closed light path. The path loops, fades, and re-enters itself. It should feel like a system feeding its output back into its input.

Primary statement:

```text
Systems now design the conditions for their own redesign.
```

Motion rule:

- No bounce.
- No decorative spinning.
- Loop motion must be slow, material, and low contrast.

### Stage 4: Self-Reference

The page briefly reveals its most philosophical line. This is the only explicit self-reference moment.

Primary statement:

```text
A system observing the system that changes it.
```

Interaction:

- Pointer proximity slightly changes the loop path brightness.
- The page should feel aware of observation, not animated for spectacle.

### Stage 5: Reconstruction

Several restrained nodes appear on or around the slab. They repel, attract, and settle into a new order as scroll reaches the final stage.

Primary statement:

```text
Make room for AI. Rebuild the room.
```

CTA:

```text
Start a conversation
```

The reconstruction should imply that the old system was not destroyed theatrically. It was reorganized to make space.

## Interaction Model

### Pointer

Pointer state remains window-level to avoid blind spots. `Hero.tsx` writes pointer target values. WebGL reads the mutable state.

Pointer should drive:

- Slab inertial tilt.
- Subtle material sheen.
- Optional loop brightness in recursion and self-reference stages.
- Optional node attraction when in reconstruction stage.

Pointer should not drive:

- Long text movement.
- CTA behavior through React handlers.
- High-amplitude parallax that harms legibility.

### Scroll

Introduce a normalized scroll progress value:

```ts
type ScrollStage = "observation" | "causality" | "recursion" | "selfReference" | "reconstruction";

interface InteractionState {
  pointer: { x: number; y: number };
  pointerCurrent: { x: number; y: number };
  scroll: {
    y: number;
    progress: number;
    stage: ScrollStage;
    stageProgress: number;
  };
}
```

Scroll should drive:

- Camera or slab vertical offset.
- Slab material stage uniform.
- Ground plane visibility and depth.
- DOM section reveal opacity.
- Node emergence and settle state.

### Physics

Keep the existing spring-damper slab physics.

For node interaction, use lightweight deterministic physics before considering a full physics library:

- Position and velocity vectors.
- Distance-based repulsion.
- Stage-based attraction targets.
- Boundary constraints on the slab plane.
- Velocity cap.
- Damping.

Do not add Rapier, Cannon, or other rigid-body libraries in the first iteration. The goal is quiet restructuring, not simulation spectacle.

## Visual System

### Palette

Keep the existing obsidian and warm off-white identity.

Allowed refinements:

- Slightly warmer edge light in final reconstruction stage.
- Very low-opacity cyan/blue-gray glows.
- No saturated accent color fields.
- No pure white.

### Typography

Keep Georgia and the existing editorial scale unless a later design decision replaces the entire identity.

Do not add Inter, Roboto, or system-ui.

Avoid repeated tiny uppercase labels for every section. Use sparse labels only when they carry structural meaning.

### Layout

The site becomes a long scroll page with one persistent WebGL scene.

DOM copy should be sparse and staged. Each viewport should have one idea. Avoid card grids in the first implementation.

The WebGL slab remains the single focal object.

## Performance Strategy

Desktop:

- Keep one R3F `Canvas`.
- Reuse uniforms and vectors.
- Avoid per-frame object allocation.
- Cap DPR to `[1, 2]`, with possible later reduction to `[1, 1.5]` if needed.
- Keep particle count low.

Mobile:

- DPR `[1, 1]`.
- Antialias disabled.
- Node physics simplified or disabled.
- Hover/proximity behavior disabled.
- Scroll stages remain readable.
- Entrance animation skipped.

Reduced motion:

- Disable pointer parallax and animated loop motion.
- Present static stage states.
- Keep content visible by default.

Tab visibility:

- Pause or reduce frame work when `document.hidden`.
- Later consider `frameloop="demand"` plus explicit invalidation if animation cost becomes high.

## Accessibility

- DOM text remains readable without WebGL.
- Canvas remains decorative with `aria-hidden` unless future interactive semantics require otherwise.
- CTA remains a real link.
- Reduced motion must preserve content and hierarchy.
- Contrast must remain high enough against the obsidian background.

## Implementation Boundaries

Do:

- Preserve the current single-canvas architecture.
- Add scroll-driven state in one place.
- Add shader uniforms for stage transitions.
- Add a small node system inside WebGL if needed.
- Keep copy short and declarative.

Do not:

- Add a second competing 3D focal mesh.
- Add a full physics engine in the first iteration.
- Convert the page into a text-heavy essay.
- Add React handlers to CTA.
- Replace Tailwind v4 theme setup with Tailwind v3 config.
- Change palette or font family casually.

## Iteration Sequence

1. Product and design documentation.
2. Page structure and scroll progress.
3. Copy and narrative sections.
4. Scroll-driven WebGL stage uniforms.
5. Recursion loop shader.
6. Reconstruction node physics.
7. Mobile and reduced-motion hardening.
8. Visual QA and performance pass.

## Open Decisions

These can be decided during implementation:

- Whether the final site includes a traditional work/project section.
- Whether primary copy stays English-only or adds restrained Chinese notes.
- Whether the recursion loop is a shader-only effect or a small line geometry.
- Whether node interaction supports click-through project details in a later version.
