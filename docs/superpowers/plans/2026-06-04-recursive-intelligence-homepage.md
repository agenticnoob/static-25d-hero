# Recursive Intelligence Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current single-screen WebGL hero into a high-end personal homepage that expresses AI-native recursive intelligence through scroll, pointer inertia, WebGL stage transitions, and restrained copy.

**Architecture:** Preserve the existing single R3F Canvas and single focal slab. Add a unified interaction state for pointer and scroll, then progressively connect DOM narrative sections and WebGL uniforms to that state.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 via `@theme`, TypeScript strict, Three.js 0.184, @react-three/fiber 9.6.

---

## File Structure

Create:

- `src/lib/interaction.ts`
  - Shared stage names, progress helpers, and interaction types.

- `src/content/homepage.ts`
  - Homepage copy and section metadata.

- `src/components/NarrativeSection.tsx`
  - Reusable DOM section for sparse staged copy.

- `src/components/RecursiveScene.tsx`
  - Later replacement or wrapper for the current `WebGLSlab` naming if the scene grows beyond slab semantics.

Modify:

- `app/page.tsx`
  - Render the long homepage, not only one hero viewport.

- `src/components/Hero.tsx`
  - Keep ownership of pointer and scroll interaction state.
  - Render narrative sections.
  - Pass scroll stage data to WebGL.

- `src/components/WebGLSlab.tsx`
  - Accept scroll/stage refs or uniforms.
  - Add shader stage uniforms.
  - Add recursive loop and reconstruction nodes in later tasks.

- `app/globals.css`
  - Add long-page layout styles, section reveal styles, reduced-motion rules.

- `README.md`
  - Update project description after the first functional iteration.

Do not modify:

- Tailwind configuration style. There is no `tailwind.config.js`.
- Palette and typography identity unless a separate design decision approves it.

## Task 1: Add Product and Design Documentation

**Files:**

- Created: `PRODUCT.md`
- Created: `docs/superpowers/specs/2026-06-04-recursive-intelligence-homepage-design.md`
- Created: `docs/superpowers/plans/2026-06-04-recursive-intelligence-homepage.md`

- [ ] **Step 1: Review the positioning doc**

Run:

```bash
sed -n '1,220p' PRODUCT.md
```

Expected:

- The homepage is positioned as an AI-native personal manifesto, not a conventional portfolio.
- The phrase "The interface is no longer for humans alone." appears.

- [ ] **Step 2: Review the design spec**

Run:

```bash
sed -n '1,260p' docs/superpowers/specs/2026-06-04-recursive-intelligence-homepage-design.md
```

Expected:

- The five stages appear: Observation, Causality, Recursion, Self-Reference, Reconstruction.
- The implementation boundaries preserve one WebGL focal object.

- [ ] **Step 3: Check the worktree before code changes**

Run:

```bash
git status --short
```

Expected:

- Documentation files are visible as untracked or modified.
- Existing user changes in source files remain untouched unless the next task explicitly modifies them.

## Task 2: Create Shared Interaction Types

**Files:**

- Create: `src/lib/interaction.ts`

- [ ] **Step 1: Create the interaction helper module**

Add `src/lib/interaction.ts`:

```ts
export const SCROLL_STAGES = [
  "observation",
  "causality",
  "recursion",
  "selfReference",
  "reconstruction",
] as const;

export type ScrollStage = (typeof SCROLL_STAGES)[number];

export interface PointerState {
  x: number;
  y: number;
}

export interface ScrollState {
  y: number;
  progress: number;
  stage: ScrollStage;
  stageProgress: number;
}

export interface InteractionState {
  pointer: PointerState;
  pointerCurrent: PointerState;
  scroll: ScrollState;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getScrollStage(progress: number): {
  stage: ScrollStage;
  stageProgress: number;
} {
  const p = clamp01(progress);
  const count = SCROLL_STAGES.length;
  const scaled = p * count;
  const index = Math.min(count - 1, Math.floor(scaled));
  const stageStart = index / count;
  const stageEnd = (index + 1) / count;
  const stageProgress = clamp01((p - stageStart) / (stageEnd - stageStart));

  return {
    stage: SCROLL_STAGES[index],
    stageProgress,
  };
}
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected:

- TypeScript completes with no errors.

- [ ] **Step 3: Commit when this task is isolated**

Run only after confirming the staged diff contains only this task:

```bash
git add src/lib/interaction.ts
git commit -m "feat: add homepage interaction state types"
```

## Task 3: Move Homepage Copy Into Content Data

**Files:**

- Create: `src/content/homepage.ts`

- [ ] **Step 1: Add copy data**

Add `src/content/homepage.ts`:

```ts
import type { ScrollStage } from "@/lib/interaction";

export interface HomepageSection {
  stage: ScrollStage;
  kicker: string;
  title: string;
  body: string;
}

export const homepageSections: HomepageSection[] = [
  {
    stage: "observation",
    kicker: "Observation",
    title: "Designing interfaces for recursive intelligence.",
    body: "Former frontend engineer. Now rebuilding the conditions software is built for.",
  },
  {
    stage: "causality",
    kicker: "Causality",
    title: "Every tool changes the workflow around it.",
    body: "Tool changes workflow. Workflow changes organization. Organization changes cognition. Cognition changes the world.",
  },
  {
    stage: "recursion",
    kicker: "Recursion",
    title: "Systems now design the conditions for their own redesign.",
    body: "Output becomes input. The interface becomes a feedback surface.",
  },
  {
    stage: "selfReference",
    kicker: "Self-reference",
    title: "A system observing the system that changes it.",
    body: "The page describes a changed interface by behaving like one.",
  },
  {
    stage: "reconstruction",
    kicker: "Reconstruction",
    title: "Make room for AI. Rebuild the room.",
    body: "The old structure is not decorated with intelligence. It is reorganized around it.",
  },
];
```

- [ ] **Step 2: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected:

- TypeScript completes with no errors.

- [ ] **Step 3: Commit when this task is isolated**

```bash
git add src/content/homepage.ts
git commit -m "feat: add recursive homepage copy"
```

## Task 4: Add Narrative Section Component

**Files:**

- Create: `src/components/NarrativeSection.tsx`

- [ ] **Step 1: Create the component**

Add `src/components/NarrativeSection.tsx`:

```tsx
import type { HomepageSection } from "@/content/homepage";

interface NarrativeSectionProps {
  section: HomepageSection;
}

export default function NarrativeSection({ section }: NarrativeSectionProps) {
  return (
    <section
      className="narrative-section relative z-20 flex min-h-[100svh] items-center"
      data-stage={section.stage}
      aria-labelledby={`section-${section.stage}`}
    >
      <div className="narrative-section-inner mx-auto w-full max-w-[760px] px-6 text-center md:px-10">
        <p className="narrative-kicker mb-6">{section.kicker}</p>
        <h2 id={`section-${section.stage}`} className="narrative-title">
          {section.title}
        </h2>
        <p className="narrative-body">{section.body}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add CSS for the component**

Append to `app/globals.css`:

```css
.narrative-section {
  pointer-events: none;
}

.narrative-section-inner {
  transform: translate3d(0, 0, 0);
}

.narrative-kicker {
  color: rgba(237, 233, 227, 0.38);
  font-family: Georgia, "Times New Roman", "SF Pro Display", "Segoe UI", Arial, serif;
  font-size: 10px;
  font-style: italic;
  letter-spacing: 0.28em;
  line-height: 1.6;
  text-transform: uppercase;
}

.narrative-title {
  color: #EDE9E3;
  font-family: Georgia, "Times New Roman", "SF Pro Display", "Segoe UI", Arial, serif;
  font-size: clamp(34px, 5vw, 64px);
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.12;
  text-wrap: balance;
}

.narrative-body {
  color: rgba(237, 233, 227, 0.56);
  font-family: Georgia, "Times New Roman", "SF Pro Display", "Segoe UI", Arial, serif;
  font-size: 15px;
  font-style: italic;
  letter-spacing: 0.01em;
  line-height: 1.7;
  margin: 24px auto 0;
  max-width: 620px;
  text-wrap: pretty;
}

@media (max-width: 768px) {
  .narrative-title {
    font-size: clamp(28px, 8vw, 46px);
  }

  .narrative-body {
    font-size: 13px;
  }
}
```

- [ ] **Step 3: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected:

- TypeScript completes with no errors.

- [ ] **Step 4: Commit when this task is isolated**

```bash
git add src/components/NarrativeSection.tsx app/globals.css
git commit -m "feat: add homepage narrative sections"
```

## Task 5: Convert Hero Into a Long Scroll Surface

**Files:**

- Modify: `src/components/Hero.tsx`
- Modify: `app/page.tsx` only if needed

- [ ] **Step 1: Import content and narrative component**

At the top of `src/components/Hero.tsx`, add:

```ts
import { homepageSections } from "@/content/homepage";
import NarrativeSection from "./NarrativeSection";
import { getScrollStage } from "@/lib/interaction";
```

- [ ] **Step 2: Add scroll progress refs**

Inside `Hero`, near existing scroll refs, add:

```ts
const scrollProgressRef = useRef(0);
const scrollStageRef = useRef(getScrollStage(0));
```

- [ ] **Step 3: Update scroll progress in the rAF loop**

Inside `tick`, before slab wrapper transform, add:

```ts
const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
scrollProgressRef.current = Math.max(0, Math.min(1, scrollYRef.current / maxScroll));
scrollStageRef.current = getScrollStage(scrollProgressRef.current);
```

- [ ] **Step 4: Replace single-copy structure with staged sections**

Keep the top-left brand, top-right meta, and WebGL slab wrapper. Replace the current single `.hero-copy` section with:

```tsx
<div className="relative z-20">
  {homepageSections.map((section) => (
    <NarrativeSection key={section.stage} section={section} />
  ))}
</div>
```

The outer `<main>` should no longer be only `min-h-[100dvh]`; it should support long scroll:

```tsx
className="relative min-h-[500svh] overflow-hidden"
```

- [ ] **Step 5: Type-check**

Run:

```bash
npx tsc --noEmit
```

Expected:

- TypeScript completes with no errors.

- [ ] **Step 6: Build**

Run:

```bash
npm run build
```

Expected:

- Next.js static build completes.

- [ ] **Step 7: Commit when this task is isolated**

```bash
git add src/components/Hero.tsx app/page.tsx
git commit -m "feat: extend hero into recursive homepage"
```

## Task 6: Pass Scroll Stage Into WebGL

**Files:**

- Modify: `src/components/Hero.tsx`
- Modify: `src/components/WebGLSlab.tsx`
- Modify: `src/lib/interaction.ts`

- [ ] **Step 1: Add scene state type**

In `src/lib/interaction.ts`, add:

```ts
export interface SceneState {
  scrollProgress: number;
  stageIndex: number;
  stageProgress: number;
}

export function getStageIndex(stage: ScrollStage): number {
  return SCROLL_STAGES.indexOf(stage);
}
```

- [ ] **Step 2: Add scene state ref in Hero**

In `src/components/Hero.tsx`, add:

```ts
const sceneStateRef = useRef({
  scrollProgress: 0,
  stageIndex: 0,
  stageProgress: 0,
});
```

After `scrollStageRef.current = getScrollStage(...)`, add:

```ts
sceneStateRef.current.scrollProgress = scrollProgressRef.current;
sceneStateRef.current.stageIndex = SCROLL_STAGES.indexOf(scrollStageRef.current.stage);
sceneStateRef.current.stageProgress = scrollStageRef.current.stageProgress;
```

Also import `SCROLL_STAGES`.

- [ ] **Step 3: Pass scene state to WebGLSlab**

Change:

```tsx
<WebGLSlab physRef={slabPhysRef} />
```

to:

```tsx
<WebGLSlab physRef={slabPhysRef} sceneStateRef={sceneStateRef} />
```

- [ ] **Step 4: Accept scene state in WebGLSlab**

In `src/components/WebGLSlab.tsx`, import:

```ts
import type { SceneState } from "@/lib/interaction";
```

Change props:

```ts
interface WebGLSlabProps {
  physRef: React.MutableRefObject<PhysicsState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
}
```

Update function signature:

```ts
export default function WebGLSlab({ physRef, sceneStateRef }: WebGLSlabProps) {
```

- [ ] **Step 5: Add uniforms**

In `slabUniforms`, add:

```ts
uScrollProgress: { value: 0 },
uStageIndex: { value: 0 },
uStageProgress: { value: 0 },
```

Pass `sceneStateRef` to `SlabMesh`.

- [ ] **Step 6: Update uniforms in SlabMesh**

Update `SlabMeshProps`:

```ts
sceneStateRef: React.MutableRefObject<SceneState>;
```

In `SlabMesh.useFrame`, add:

```ts
const scene = sceneStateRef.current;
slabMatRef.current.uniforms.uScrollProgress.value = scene.scrollProgress;
slabMatRef.current.uniforms.uStageIndex.value = scene.stageIndex;
slabMatRef.current.uniforms.uStageProgress.value = scene.stageProgress;
```

- [ ] **Step 7: Declare uniforms in slab fragment shader**

In `slabFrag`, add:

```glsl
uniform float uScrollProgress;
uniform float uStageIndex;
uniform float uStageProgress;
```

- [ ] **Step 8: Type-check and build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected:

- TypeScript passes.
- Static build completes.

- [ ] **Step 9: Commit when this task is isolated**

```bash
git add src/lib/interaction.ts src/components/Hero.tsx src/components/WebGLSlab.tsx
git commit -m "feat: connect scroll stages to webgl scene"
```

## Task 7: Add Recursive Loop Shader State

**Files:**

- Modify: `src/components/WebGLSlab.tsx`

- [ ] **Step 1: Add a recursion mask to the slab shader**

Inside `slabFrag`, before final `gl_FragColor`, add:

```glsl
float recursionStage = smoothstep(1.6, 2.0, uStageIndex + uStageProgress)
                     * (1.0 - smoothstep(3.2, 3.8, uStageIndex + uStageProgress));

vec2 loopUv = vUv - vec2(0.5);
float loopRadius = length(loopUv);
float loopAngle = atan(loopUv.y, loopUv.x);
float loopLine = 1.0 - smoothstep(0.006, 0.018, abs(loopRadius - 0.28));
float loopGate = smoothstep(-0.6, 0.6, sin(loopAngle * 2.0 + uTime * 0.55));
float loopGlow = loopLine * loopGate * recursionStage * 0.12;
col += vec3(0.26, 0.48, 0.68) * loopGlow;
```

- [ ] **Step 2: Build**

Run:

```bash
npm run build
```

Expected:

- Build completes.

- [ ] **Step 3: Visual check**

Run the dev server:

```bash
npm run dev
```

Expected:

- The page is available at `http://localhost:3000`.
- Scrolling into the recursion stage reveals a restrained loop effect on the slab.

- [ ] **Step 4: Commit when this task is isolated**

```bash
git add src/components/WebGLSlab.tsx
git commit -m "feat: add recursive slab loop shader"
```

## Task 8: Add Quiet Reconstruction Nodes

**Files:**

- Modify: `src/components/WebGLSlab.tsx`

- [ ] **Step 1: Add node data type and component**

In `src/components/WebGLSlab.tsx`, add a small `ReconstructionNodes` component after `GroundPlane`.

Use deterministic initial positions, not random positions, to keep SSR/client visual behavior stable:

```tsx
const NODE_POINTS = [
  [-1.4, 0.04, -0.7],
  [-0.6, 0.04, 0.42],
  [0.2, 0.04, -0.22],
  [0.9, 0.04, 0.64],
  [1.35, 0.04, -0.48],
] as const;

function ReconstructionNodes({
  sceneStateRef,
}: {
  sceneStateRef: React.MutableRefObject<SceneState>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const scene = sceneStateRef.current;
    const visible = scene.stageIndex >= 4 ? scene.stageProgress : 0;
    if (!groupRef.current) return;
    groupRef.current.visible = visible > 0.01;
    groupRef.current.children.forEach((child, index) => {
      const offset = (index - 2) * 0.018 * visible;
      child.position.y = 0.04 + Math.sin(scene.stageProgress * Math.PI + index) * 0.025 * visible;
      child.position.x = NODE_POINTS[index][0] + offset;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {NODE_POINTS.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.028, 16, 16]} />
          <meshBasicMaterial color="#78c8ff" transparent opacity={0.55} />
        </mesh>
      ))}
    </group>
  );
}
```

- [ ] **Step 2: Render nodes in the Canvas**

Inside `<Canvas>`, after `<SlabMesh />`, add:

```tsx
<ReconstructionNodes sceneStateRef={sceneStateRef} />
```

- [ ] **Step 3: Type-check and build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected:

- TypeScript passes.
- Build completes.

- [ ] **Step 4: Commit when this task is isolated**

```bash
git add src/components/WebGLSlab.tsx
git commit -m "feat: add reconstruction nodes"
```

## Task 9: Harden Motion and Performance

**Files:**

- Modify: `src/components/Hero.tsx`
- Modify: `src/components/WebGLSlab.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add reduced motion CSS**

Append to `app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .narrative-section,
  .narrative-section-inner,
  .narrative-title,
  .narrative-body {
    transform: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: Add visibility pause flag**

In `Hero.tsx`, add:

```ts
const isPageVisibleRef = useRef(true);
```

Inside the rAF effect, add a visibility listener:

```ts
const onVisibilityChange = () => {
  isPageVisibleRef.current = !document.hidden;
};
document.addEventListener("visibilitychange", onVisibilityChange);
```

At the start of `tick`, add:

```ts
if (!isPageVisibleRef.current) {
  rafRef.current = requestAnimationFrame(tick);
  return;
}
```

In cleanup:

```ts
document.removeEventListener("visibilitychange", onVisibilityChange);
```

- [ ] **Step 3: Confirm mobile DPR is still capped**

Review `WebGLSlab.tsx` and confirm:

```ts
const dpr: [number, number] = isTouch.current ? ([1, 1] as const) : ([1, 2] as const);
```

If performance is poor after visual testing, change desktop to:

```ts
const dpr: [number, number] = isTouch.current ? ([1, 1] as const) : ([1, 1.5] as const);
```

- [ ] **Step 4: Type-check and build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected:

- TypeScript passes.
- Build completes.

- [ ] **Step 5: Commit when this task is isolated**

```bash
git add src/components/Hero.tsx src/components/WebGLSlab.tsx app/globals.css
git commit -m "perf: harden recursive homepage motion"
```

## Task 10: Final Visual QA

**Files:**

- Modify files only if QA finds issues.

- [ ] **Step 1: Start local dev server**

Run:

```bash
npm run dev
```

Expected:

- Local server starts at `http://localhost:3000`, or another available port if 3000 is occupied.

- [ ] **Step 2: Desktop visual check**

Open `http://localhost:3000`.

Expected:

- First viewport has one clear focal object.
- Copy does not overlap the slab incoherently.
- Scroll reveals staged copy.
- Recursive loop is subtle.
- Reconstruction nodes do not look playful or game-like.

- [ ] **Step 3: Mobile visual check**

Open a mobile viewport around `390x844`.

Expected:

- Text fits without overflow.
- Canvas remains nonblank.
- Mobile interaction is readable without hover.
- No excessive jank.

- [ ] **Step 4: Final build**

Run:

```bash
npx tsc --noEmit
npm run build
```

Expected:

- TypeScript passes.
- Build completes.

- [ ] **Step 5: Commit final fixes**

```bash
git add app src README.md PRODUCT.md docs/superpowers
git commit -m "feat: build recursive intelligence homepage"
```

## Self-Review

Spec coverage:

- Product positioning is covered by Task 1.
- Shared scroll and pointer state is covered by Tasks 2, 5, and 6.
- Sparse narrative copy is covered by Tasks 3, 4, and 5.
- WebGL stage transitions are covered by Tasks 6 and 7.
- Reconstruction nodes are covered by Task 8.
- Motion and performance hardening is covered by Task 9.
- Visual QA is covered by Task 10.

Placeholder scan:

- No task uses unfinished placeholder markers or deferred implementation language.
- Each code task includes concrete file paths and code snippets.

Type consistency:

- `ScrollStage`, `SceneState`, `InteractionState`, and `HomepageSection` are introduced before usage.
- `sceneStateRef` is consistently passed from `Hero.tsx` to `WebGLSlab.tsx`.
