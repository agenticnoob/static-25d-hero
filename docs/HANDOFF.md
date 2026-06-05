# Handoff — Recursive Intelligence Homepage

## 当前结论

当前首页仍是 noobli 的中文优先空间化个人主页，不是简历页、项目列表页或文章索引页。页面通过五个阶段表达观察、因果、递归、自指、重构。

本轮关键变化：WebGL 主体已经从物理 slab / room 方向转为固定的 recursive stela。它是一个厚重、可观测的黑曜石/石墨碑体，概念藏在内凹层级、刻线和镜头叙事里。

## 当前实现

- `Hero.tsx`
  - 仍是 DOM 叙事、指针、滚动状态的主要 owner。
  - 使用统一 rAF 循环写入 narrative presence、title counter-parallax、`coreInteractionRef`、`sceneStateRef`。
  - 使用 Lenis + ScrollTrigger 获取滚动进度和滚动节奏。

- `WebGLSlab.tsx`
  - 文件名保留旧称，但当前内容不是薄 slab。
  - 渲染一个 R3F Canvas，包含固定 `BgQuad` 背景和单一 recursive stela 主体。
  - 主体由厚重 extruded geometry、front inset panels、ridge panels、engraved line paths 组成。
  - 通过 `CAMERA_RAIL_DESKTOP` / `CAMERA_RAIL_COMPACT` 做镜头叙事。
  - 没有 Rapier、RigidBody、Collider、room bounds、gravity、collision、restitution 或 random impulse。

- `src/content/homepage.ts`
  - 五段中文叙事仍保持短句表达。
  - 可见文案已去掉旧 `slab` 称呼。

## 依赖状态

当前 active runtime:

- Next.js / React / TypeScript
- Tailwind CSS v4
- Three.js / @react-three/fiber / @react-three/drei
- Lenis
- GSAP ScrollTrigger
- Motion
- Zustand

`@react-three/rapier` 已移除，因为当前 WebGL 方向不再使用刚体房间或碰撞。

## 设计约束

- 单一 WebGL 主体。
- 不增加 room cage、粒子爆发、第二个 3D 物体或游戏化物理。
- 主体应先像一个现实可观测物体，再承载哲学、AI、循环、自我指涉。
- 不做圆环、断裂圆环、双环、方块挖洞、薄板。
- 维持 obsidian + warm off-white 身份。
- 维持 Georgia 字体。
- CTA 继续纯 CSS hover。
- WebGL wrapper 不随 scroll 做 DOM transform。

## 已同步文档

- `README.md`
- `PRODUCT.md`
- `DESIGN.md`
- `HANDOFF.md`
- `docs/HANDOFF.md`
- `docs/NEXT_STEPS.md`
- `docs/CODE_DOC_ALIGNMENT.md`

历史 Superpowers spec/plan 保留为历史记录，不作为当前 runtime 真相。

## 验证建议

每次提交前运行：

```bash
npm run typecheck
npm test
git diff --check
npm run build
```

`npm run build` 在 Codex 默认沙箱中可能因为 Turbopack 创建进程/绑定端口失败，需要提权重跑。同样，构建后如 `next-env.d.ts` 被自动切到 `.next/types/routes.d.ts`，应恢复为当前 dev 引用，避免提交生成噪声。

## 下一步

1. 视觉 QA 当前 recursive stela 是否仍像洞、环或薄板。
2. 如果还不够可信，优先调厚度、边缘、材质粗糙度和前表面 recess，不要回到抽象环状符号。
3. 后续可把 `WebGLSlab.tsx` / `SlabMesh` 这些旧命名重命名为 stela/core，但应单独做，避免和视觉迭代混在一起。
