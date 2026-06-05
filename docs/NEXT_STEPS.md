# 下一步迭代计划

## 当前目标

继续把 `static-25d-hero` 打磨成一个中文的、空间化的 AI-native 个人主页。它应该表达 noobli 从传统前端工程进入递归智能、Agentic workflow、目标定义与系统治理方向的转变。

`data/` 目录只作为参考素材，不作为页面结构蓝本。不得把首页改成简历站、项目列表页或文章索引页。

## 已确认约束

- 保持 obsidian + warm off-white 视觉身份。
- 保持 Georgia 字体，不引入 Inter、Roboto、system-ui。
- 保持单一 WebGL 主体，不增加第二个竞争 3D 物体。
- 当前主体是 recursive stela，不是薄 slab、圆环、洞、物理刚体或房间里的物体。
- 不使用 bounce、elastic、overshoot、碰撞、重力或游戏化物理。
- CTA 继续使用纯 CSS hover，不加 React 事件处理。
- Tailwind v4 继续通过 `@theme` 管理 token，不加入 v3 风格配置。

## 本轮完成状态

- WebGL runtime 已移除 Rapier/room/physics/collision 方向。
- `@react-three/rapier` 已从依赖中移除。
- 主体改成厚重 recursive stela：厚碑体、front inset panels、ridge panels、engraved recursive paths。
- 滚动叙事改由 camera rail、pointer parallax 和材质响应表达。
- shader 中会被读成圆环的 loop/ring 纹理已移除。
- 可见文案已去掉旧 `slab` 称呼。
- README、PRODUCT、DESIGN、HANDOFF 和本文件已同步到当前架构。

当前可回退状态：

- 仍是一个 WebGL scene、一个主要对象、一个 DOM/rAF interaction owner。
- `WebGLSlab.tsx` 和 `SlabMesh` 是遗留命名，当前实现语义已经是 stela/core。

## 下一阶段任务

1. **视觉 QA**
   - 刷新 `http://localhost:3000`。
   - 检查第一眼是否读成厚重 artifact，而不是洞、环、薄板或廉价遗迹资产。
   - 检查桌面和 360px 移动端。

2. **形体打磨**
   - 如果主体仍显薄，增加视觉厚度和侧面权重。
   - 如果像“贴片”，降低 front panel 的 opacity 或改成更像切削凹面。
   - 如果像游戏遗迹，减少破损感，保留更精密的石墨/黑曜石工艺感。

3. **材质打磨**
   - 继续压低亮线，避免电路板和 neon cliché。
   - 增加低对比矿物噪声、边缘磨损和 satin graphite 高光。
   - 保持 warm off-white 高光，不使用纯白。

4. **命名清理**
   - 单独将 `WebGLSlab.tsx`、`SlabMesh`、`slabUniforms` 等旧命名迁移到 stela/core。
   - 这一步应单独提交，避免和视觉参数混在一起。

5. **文档持续同步**
   - 后续如果继续调整 `WebGLSlab.tsx` 的 shader literal 色值，需要同步 `DESIGN.md`。
   - 如果引入新的 runtime 依赖，必须在 `README.md` 标出 implemented/planned 状态。

## 推荐执行顺序

先做视觉 QA，再打磨形体厚度和材质，最后做命名清理。不要先引入新的物理库、粒子系统或第二个 WebGL 焦点。
