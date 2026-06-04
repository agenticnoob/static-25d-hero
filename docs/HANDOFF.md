# Handoff — Recursive Intelligence Homepage

## 当前中文化迭代结论

本轮目标是把首页可见文案改为中文，并补齐后续迭代文档。`data/` 目录只作为参考素材：可提炼“8 年前端经验、AI 驱动开发实践、目标定义、系统治理、Agentic workflow”等背景事实，但不能把当前站点改成传统简历页、多页面作品集或文章索引。

当前产品方向保持不变：

- 空间化个人主页，不是简历模板。
- WebGL slab 是唯一视觉焦点。
- 文字短、克制、中文表达，哲学藏在结构里。
- 叙事仍按观察、因果、递归、自指、重构推进。

## Current Objective

Build noobli's personal homepage as a high-end AI-native spatial manifesto.

The page should not behave like a conventional frontend portfolio. It should express the user's philosophy through structure: observation, causality, recursion, self-reference, and reconstruction.

## User Intent

The user was a frontend development engineer and wants the site to express:

- Embracing AI rather than resisting it.
- A serious understanding of AI's causal revolution.
- Self-looping systems, self-reference, and recursive iteration.
- AI changing workflows, organizations, interfaces, and eventually the world.
- The idea that making things convenient for AI also makes things convenient for us.
- Many old structures may need to be overturned and rebuilt.
- Philosophy should be hidden in the structure, not explained as a long essay.

Default conversation language: Chinese.

## Documents Written

- `PRODUCT.md`
  - Product and personal brand positioning.

- `docs/superpowers/specs/2026-06-04-recursive-intelligence-homepage-design.md`
  - Design spec for the five-stage recursive homepage.

- `docs/superpowers/plans/2026-06-04-recursive-intelligence-homepage.md`
  - Implementation plan.

## Implementation Completed In This Pass

Created:

- `src/lib/interaction.ts`
  - Defines scroll stages, interaction state types, `getScrollStage`, and `getStageIndex`.

- `src/content/homepage.ts`
  - Defines the five narrative sections.

- `src/components/NarrativeSection.tsx`
  - Renders sparse staged copy and optional CTA.

Modified:

- `src/components/Hero.tsx`
  - Converted the page from a single hero into a 500svh long-scroll surface.
  - Kept the existing unified rAF loop.
  - Added scroll progress and scroll stage refs.
  - Added `sceneStateRef` and passed it to `WebGLSlab`.
  - Kept the WebGL canvas fixed in the viewport instead of stretching it to 500svh.
  - Replaced the old one-off hero copy with mapped `NarrativeSection` entries.

- `src/components/WebGLSlab.tsx`
  - Added `SceneState` prop.
  - Added slab shader uniforms:
    - `uScrollProgress`
    - `uStageIndex`
    - `uStageProgress`
  - Added a very subtle causal trace line and stage-based darkening in the slab shader.

- `app/globals.css`
  - Added narrative section styles.
  - Added reduced-motion rules for narrative text.

## Verification Completed

Commands run:

```bash
npx tsc --noEmit
```

Result: passed.

```bash
npm run build
```

Result: first attempt failed due sandbox restriction:

```text
creating new process
binding to a port
Operation not permitted (os error 1)
```

Rerun with escalation succeeded:

```text
✓ Compiled successfully
✓ Generating static pages using 4 workers (3/3)
○ / prerendered as static content
```

Dev server verification:

```bash
npm run dev
```

Result:

```text
Local: http://localhost:3000
Ready
```

Local HTTP check:

```bash
curl --noproxy '*' -I http://127.0.0.1:3000
```

Result:

```text
HTTP/1.1 200 OK
```

Rendered content check:

```bash
curl --noproxy '*' -s http://127.0.0.1:3000 | rg -o "Designing interfaces|Every tool changes|Make room for AI|Recursive intelligence"
```

Result included:

```text
Recursive intelligence
Designing interfaces
Every tool changes
Make room for AI
```

Browser screenshot QA has not been completed in this pass because the in-app Browser control tool was not exposed in the available tool search results, and Playwright is not installed in `node_modules`.

## Latest QA Update

A later in-app Browser pass completed the first Chinese visual QA round on desktop and 360px mobile. The fixed WebGL canvas stayed pinned to the viewport, all five narrative stages activated in order, and horizontal overflow was not observed.

One mobile issue was fixed: in the reconstruction stage, final copy and CTA were visually too close to the bright slab. `app/globals.css` now positions only the mobile reconstruction copy in the upper third of the viewport so the slab remains the single lower focal object.

## Current Worktree Notes

The worktree was already dirty before implementation. Pre-existing modified files included:

- `README.md`
- `app/globals.css`
- `src/components/Hero.tsx`
- `src/components/VoidField.tsx`
- `src/components/WebGLSlab.tsx`

New and modified files from this pass are mixed into that dirty worktree. Do not run destructive git commands. Do not revert user changes.

## Next Recommended Step

最新下一步计划已写入：

- `docs/NEXT_STEPS.md`

Run visual QA in the next session if Browser tools are available:

1. Start dev server with `npm run dev`.
2. Open `http://localhost:3000`.
3. Check desktop and mobile viewports.
4. Confirm:
   - Canvas is nonblank.
   - WebGL stays fixed while sections scroll.
   - Text does not overlap incoherently with slab.
   - CTA appears only in the reconstruction section.
   - Stage-driven slab trace is subtle.

After visual QA, continue with the next implementation phase:

1. Add stronger scroll-stage DOM styling, so non-active sections recede quietly.
2. Add recursion loop shader for the recursion stage.
3. Add quiet reconstruction nodes for the final stage.
4. Add mobile/reduced-motion hardening.
5. Update `README.md`.

## Important Constraints

- Do not change the obsidian + warm off-white palette without explicit approval.
- Do not change Georgia typography without explicit approval.
- Do not add Inter, Roboto, or system-ui.
- Do not add bounce, elastic, or playful overshoot.
- Do not add a second competing 3D focal object.
- Do not add a full physics engine in the first iteration.
- CTA must remain pure CSS hover, no React event handlers.
- Tailwind v4 uses `@theme` in `app/globals.css`; do not add Tailwind v3 config patterns.
