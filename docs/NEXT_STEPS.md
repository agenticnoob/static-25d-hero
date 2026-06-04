# 下一步迭代计划

## 当前目标

继续把 `static-25d-hero` 打磨成一个中文的、空间化的 AI-native 个人主页。它应该表达 noobli 从传统前端工程进入递归智能、Agentic workflow、目标定义与系统治理方向的转变。

`data/` 目录只作为参考素材，不作为页面结构蓝本。不得把首页改成简历站、项目列表页或文章索引页。

## 已确认约束

- 保持 obsidian + warm off-white 视觉身份。
- 保持 Georgia 字体，不引入 Inter、Roboto、system-ui。
- 保持单一 WebGL slab 焦点，不增加第二个竞争 3D 物体。
- 不使用 bounce、elastic、overshoot 动效。
- CTA 继续使用纯 CSS hover，不加 React 事件处理。
- Tailwind v4 继续通过 `@theme` 管理 token，不加入 v3 风格配置。

## 本轮完成状态

- 首页叙事文案已改为中文。
- 页面 metadata 已改为中文。
- WebGL 层已修复视口尺寸、横向溢出和 slab 过大问题。
- 文档已补充 `data/` 参考边界。
- 已完成一轮桌面/移动端中文视觉 QA。
- 移动端 reconstruction 阶段已避开 slab 高亮区域，正文和 CTA 保持在上三分之一。
- 已补充 `npm test` 与 `npm run typecheck`，并加入 `src/lib/interaction.ts` 的阶段映射回归测试。
- 已补充 `docs/CODE_DOC_ALIGNMENT.md`，并将旧英文 Superpowers spec/plan 标注为历史计划。

## 下一阶段任务

1. **叙事节奏优化**
   - 让非当前段落更安静地退场。
   - 每个视口只保留一个清晰观点。
   - 保持正文短句，不扩展成哲学长文。

2. **WebGL 阶段表达**
   - 因果阶段：增强低对比 trace line。
   - 递归阶段：加入缓慢、克制的 loop 光路。
   - 重构阶段：加入少量节点重排，但不形成第二焦点。

3. **移动端硬化**
   - 确认 DPR 为 `[1, 1]`。
   - 触屏设备禁用标题视差和入口动画。
   - 保证中文在 360px 宽度仍可读。

4. **文档同步**
   - 保持 `README.md`、`DESIGN.md`、`docs/CODE_DOC_ALIGNMENT.md` 与当前实现一致。
   - 后续如果迁移到 Zustand/Lenis/ScrollTrigger/Rapier/Motion，应同步把 planned 状态改为 implemented。

## 推荐执行顺序

先做叙事节奏，再做 WebGL 阶段效果，最后继续移动端硬化。不要先加复杂 shader 或节点物理；当前页面的第一优先级仍是中文表达、首屏比例、滚动稳定性和可验证的回归测试。
