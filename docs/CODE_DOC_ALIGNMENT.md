# 代码与文档对齐说明

## 当前实现状态

当前首页是 noobli 的中文优先空间化个人主页，不是传统简历页或项目索引页。页面保留一句英文 thesis，其余叙事以中文为主。页面由 `Hero` 渲染五个叙事阶段（观察、因果、递归、自指、重构），并通过统一 rAF 循环控制阶段推进与鼠标/滚动状态。WebGL 仍保持单一 slab 焦点，舞台差异来自 `SceneState` 的阶段参数、slab 姿态插值、`uInertia` 材质响应和 shader 纹理叠加。

## 对齐表

| 文档位置 | 文档声明的行为 | 当前代码状态 | 处理结论 |
| --- | --- | --- | --- |
| `README.md` | noobli 空间化个人主页、五阶段叙事 | `src/content/homepage.ts` 与 `NarrativeSection` 已实现 5 阶段、每段 `kicker/title/body/signals` | 一致 |
| `README.md` | 单 WebGL scene + slab 焦点 | `WebGLSlab.tsx` 仅包含 `BgQuad` 与 `SlabMesh`，无第二个可见 3D 主体 | 一致 |
| `README.md` | Lenis、GSAP、Rapier、Motion、Zustand 仅计划项 | `package.json` 未安装这些依赖，当前为自定义 rAF/ref 管线 | 一致 |
| `DESIGN.md` | WebGL wrapper 固定，滚动变化发生在 R3F scene 内 | `Hero.tsx` 用 `fixed inset-0 h-[100svh]`，`sceneStateRef` 传入 `WebGLSlab`，只有 scene 内对象变换 | 一致 |
| `DESIGN.md` | CTA 纯 CSS hover，无 React event handlers | `NarrativeSection.tsx` 只渲染 `<a>`，hover/focus 在 `app/globals.css` | 一致 |
| `DESIGN.md` | Georgia 字体、obsidian + warm off-white、不使用纯白 | 全局 token 与组件样式保持 Georgia 和 `#EDE9E3` | 一致 |
| `DESIGN.md` | WebGL shader literal 色值应映射到 obsidian + warm off-white 身份 | `BgQuad` 使用 obsidian 深色 `vec3`，slab 使用低饱和暖灰与 off-white 高光 | 一致 |
| `docs/NEXT_STEPS.md` | 需要测试和文档收敛 | 已新增 `npm test`、`npm run typecheck`、`tests/interaction.test.mjs` 和本文件 | 已完成本轮最小收敛 |
| `docs/superpowers/*` | 英文设计/实施计划 | 当前页面已中文化，旧计划不是实时 backlog | 已标注为历史文档 |
| `AGENTS.md` | 当前场景为 BgQuad + 单 slab + 五段 DOM copy | `WebGLSlab.tsx` 只渲染 `BgQuad` 与 `SlabMesh` | 已同步 |

## 可验证行为

- `getScrollStage` 将归一化滚动进度映射到五个阶段。
- `clamp01` 对越界值、`NaN` 和无穷值做显式处理，避免阶段映射越界。
- `getCinematicScrollStage` 保留阶段起止 hold 区域，让 slab pose 不机械匀速切换。
- 第一段标题为 `h1`，后续阶段标题为 `h2`（`NarrativeSection.tsx` 映射）。
- `getCinematicScrollStage` 的 `stageProgress` 用于 `WebGLSlab.tsx` 的 `getStagePose`，在 `STAGE_POSES` 之间做平滑插值。
- Slab shader 的阶段语义：
  - 观察：`uInertia` 与 pointer 驱动低对比扫掠；
  - 因果：`slabFrag` 中 `causalTrace/traceNodes` 显示低对比 trace 与节点；
  - 递归：`loopLine/innerLoop` 显示递归回路样式；
  - 自指：`mirrorLine/mirrorEcho` 形成回射线；
  - 重构：`network/nodes` 组合逐步重排并受 `stageProgress` 平滑。
- `WebGLSlab` 只进行一次场景渲染：`BgQuad` 的固定背景 + 低饱和 slab，统一由 `sceneStateRef` 控制舞台/速度响应；WebGL wrapper 本体不做 scroll transform。
- CTA 使用真实链接，并保持纯 CSS hover/focus。
- `prefers-reduced-motion` 下 WebGL shader 时间冻结，但滚动阶段可读状态仍保留。
- `InteractionState` 是未来共享来源态形状；`SceneState` 是当前传入 WebGL 的派生渲染态。
- `npm run lint` 当前执行 TypeScript 静态检查；仓库尚未配置独立 ESLint。

## 后续文档规则

如果后续真正引入 Zustand、Lenis、GSAP ScrollTrigger、Rapier 或 Motion，必须同步更新 `README.md` 与 `DESIGN.md`，把对应条目从 planned 改为 implemented，并补充新的状态所有权和测试策略。
