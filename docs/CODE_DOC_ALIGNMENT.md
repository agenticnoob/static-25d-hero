# 代码与文档对齐说明

## 当前实现状态

当前首页是 noobli 的中文优先空间化个人主页，不是传统简历页或项目索引页。页面保留一句英文 thesis，其余叙事以中文为主。页面由 `Hero` 渲染五个叙事阶段（观察、因果、递归、自指、重构），并通过统一 rAF 循环控制阶段推进、鼠标/滚动状态和 DOM presence。

WebGL 当前保持单一 recursive fossil monolith 焦点。主体是固定 GLB 物体，滚动叙事由 camera rail、材质响应和少量 stage 姿态完成。页面 DOM/chrome 色彩当前是 `#142334` + `#baccd9` 双色撞色方向；WebGL canvas 透明，背景由网站 CSS 承担，monolith 只保留一盏主 `directionalLight`、recursive shader 高光、procedural stone texture 和 `ContactShadows`。当前没有房间、重力、碰撞、刚体、Rapier runtime 或物理玩具。

## 对齐表

| 文档位置 | 文档声明的行为 | 当前代码状态 | 处理结论 |
| --- | --- | --- | --- |
| `README.md` | noobli 空间化个人主页、五阶段叙事 | `src/content/homepage.ts` 与 `NarrativeSection` 已实现 5 阶段、每段 `kicker/title/body/signals` | 一致 |
| `README.md` | 单 WebGL scene + recursive monolith 焦点，背景由 CSS 承担 | `WebGLSlab.tsx` 渲染透明 R3F scene 与一个 GLB monolith group，无第二个可见 3D 主体 | 一致 |
| `README.md` | Lenis、GSAP、Motion、Zustand 已接入；Rapier 不在 active runtime | `Hero.tsx` 使用 Lenis/ScrollTrigger，`NarrativeSection` 使用 Motion，`heroStore` 使用 Zustand；`package.json` 不再包含 `@react-three/rapier` | 一致 |
| `DESIGN.md` | WebGL wrapper 固定，滚动变化发生在 R3F scene 内 | `Hero.tsx` 渲染固定 WebGL wrapper，`sceneStateRef` 传入 `WebGLSlab`，scene 内通过连续 camera rail 采样和 shader uniforms 表达变化 | 一致 |
| `DESIGN.md` | CTA 纯 CSS hover，无 React event handlers | `NarrativeSection.tsx` 只渲染 `<a>`，hover/focus 在 `app/globals.css` | 一致 |
| `DESIGN.md` | Georgia 字体、DOM/page chrome 使用 `#142334` + `#baccd9`，WebGL 材质单独管理 | 全局 token 与组件内联样式已同步为两色体系；`WebGLSlab.tsx` 材质色彩保持原 fossil palette | 一致 |
| `DESIGN.md` | WebGL 主体不是环、洞、薄 slab 或物理房间 | `MonolithModel` 加载 `black-layered-prism.optimized.glb`；无 Rapier/Collider/Room 代码 | 一致 |
| `docs/NEXT_STEPS.md` | 下一步优先做视觉 QA、形体和材质打磨 | 当前代码已完成基础 recursive monolith，仍需要人工视觉判断 | 一致 |
| `docs/superpowers/*` | 英文设计/实施计划 | 这些是历史计划，不是当前 runtime source of truth | 已标注为历史文档 |

## 可验证行为

- `getScrollStage` 将归一化滚动进度映射到五个阶段。
- `clamp01` 对越界值、`NaN` 和无穷值做显式处理，避免阶段映射越界。
- `getCinematicScrollStage` 保留阶段起止 hold 区域给材质和叙事状态使用；camera rail 直接采样 damped `scrollProgress`，避免阶段边界停顿。
- 第一段标题为 `h1`，后续阶段标题为 `h2`（`NarrativeSection.tsx` 映射）。
- `Hero.tsx` 使用 `sceneStateRef` 把 damped scroll progress、stage index、stage progress、scroll velocity 传入 WebGL。
- `deriveRecursiveFossilMaterialState` 把 WebGL render state 映射到 `threshold`、`engraving`、`feedback`、`compression`、`signal` 五个材质参数。
- `WebGLSlab` 只渲染透明 R3F scene + recursive fossil monolith group；页面背景由 CSS 负责。
- `WebGLSlab` 没有 `Physics`、`RigidBody`、`Collider`、`RoomCollisionVolume`、gravity、restitution、collision 或 random impulse。
- Recursive fossil monolith 的当前结构：
  - optimized GLB model from `public/models/black-layered-prism.optimized.glb`；
  - imported material enhancement via `MeshStandardMaterial` / `MeshPhysicalMaterial`；
  - procedural stone texture, bump, roughness；
  - `onBeforeCompile` recursive fossil shader layer；
  - deep valley material with restrained old-gold warm highlights。
- `Hero.tsx` 通过 fonts ready + GLB `MonolithModel` mount ready 卸载 `scene-preloader`；`WebGLSlab` Canvas 创建不会提前触发 ready，避免模型未出现时页面已经可滚动。
- CTA 使用真实链接，并保持纯 CSS hover/focus。
- `prefers-reduced-motion` 下 WebGL shader 时间冻结，但滚动阶段可读状态仍保留。
- `InteractionState` 是未来共享来源态形状；`SceneState` 是当前传入 WebGL 的派生渲染态。
- `npm run lint` 当前执行 TypeScript 静态检查；仓库尚未配置独立 ESLint。

## 后续文档规则

如果后续真正引入新的 runtime 依赖，必须同步更新 `README.md` 与 `DESIGN.md`，把对应条目从 planned 改为 implemented，并补充新的状态所有权和测试策略。

如果后续把 `WebGLSlab.tsx` / `SlabMesh` 这些遗留命名改为 stela/core，也必须同步 README、DESIGN、HANDOFF 和本文件。
