# 代码与文档对齐说明

## 当前实现状态

当前首页是中文长滚动空间化个人主页，不是传统简历页或项目索引页。页面由 `Hero` 渲染五个叙事阶段：观察、因果、递归、自指、重构。WebGL 仍保持单一 slab 焦点，阶段差异通过 slab pose、shader uniform 和低对比视觉纹理表达。

## 对齐表

| 文档位置 | 文档声明的行为 | 当前代码状态 | 处理结论 |
| --- | --- | --- | --- |
| `README.md` | 中文 AI-native 空间化个人主页，五阶段叙事 | `src/content/homepage.ts` 与 `NarrativeSection` 已实现五段中文叙事 | 一致 |
| `README.md` | Lenis、GSAP、Rapier、Motion、Zustand 是 planned | `package.json` 未安装这些依赖，代码仍使用自定义 rAF/ref 状态 | 一致，保持 planned |
| `README.md` | `@react-three/drei` 已安装但当前未用 | `package.json` 安装了 `drei`，`WebGLSlab.tsx` 未 import | 一致 |
| `DESIGN.md` | WebGL wrapper 固定，滚动变化发生在 R3F scene 内 | `Hero.tsx` wrapper 使用 `fixed inset-0 h-[100svh]`，scroll state 传给 `WebGLSlab` | 一致 |
| `DESIGN.md` | CTA 纯 CSS hover，无 React event handlers | `NarrativeSection.tsx` 只渲染 `<a>`，hover/focus 在 `app/globals.css` | 一致 |
| `DESIGN.md` | Georgia 字体、obsidian + warm off-white、不使用纯白 | 全局 token 与组件样式保持 Georgia 和 `#EDE9E3` | 一致 |
| `docs/NEXT_STEPS.md` | 需要测试和文档收敛 | 已新增 `npm test`、`npm run typecheck`、`tests/interaction.test.mjs` 和本文件 | 已完成本轮最小收敛 |
| `docs/superpowers/*` | 英文设计/实施计划 | 当前页面已中文化，旧计划不是实时 backlog | 已标注为历史文档 |
| `AGENTS.md` | 当前场景为 BgQuad + 单 slab + 五段 DOM copy | `WebGLSlab.tsx` 只渲染 `BgQuad` 与 `SlabMesh` | 已同步 |

## 可验证行为

- `getScrollStage` 将归一化滚动进度映射到五个阶段。
- `clamp01` 对越界值、`NaN` 和无穷值做显式处理，避免 stage 变成 `undefined`。
- `getCinematicScrollStage` 保留阶段起止 hold 区域，让 slab pose 不机械匀速切换。
- 首段标题是页面唯一 `h1`，后续阶段标题是 `h2`。
- CTA 使用真实链接，并保持纯 CSS hover/focus。
- `prefers-reduced-motion` 下 WebGL shader 时间冻结，但滚动阶段可读状态仍保留。
- `InteractionState` 是未来共享来源态形状；`SceneState` 是当前传入 WebGL 的派生渲染态。
- `npm run lint` 当前执行 TypeScript 静态检查；仓库尚未配置独立 ESLint。

## 后续文档规则

如果后续真正引入 Zustand、Lenis、GSAP ScrollTrigger、Rapier 或 Motion，必须同步更新 `README.md` 与 `DESIGN.md`，把对应条目从 planned 改为 implemented，并补充新的状态所有权和测试策略。
