import type { ScrollStage } from "@/lib/interaction";

export interface HomepageSection {
  stage: ScrollStage;
  kicker: string;
  title: string;
  body: string;
  signals?: string[];
  cta?: {
    href: string;
    label: string;
  };
}

export const homepageSections: HomepageSection[] = [
  {
    stage: "observation",
    kicker: "noobli / observation",
    title: "AI is not entering the old interface. It is bending it.",
    body: "前端工程曾经训练我理解旧界面的骨架。现在我更关心 AI 参与之后，界面如何观察、行动，并重写自身条件。",
  },
  {
    stage: "causality",
    kicker: "causality",
    title: "工具改变工作流，工作流改变组织。",
    body: "旧界面把工具当成按钮。AI-native interface 把工具视为因果起点，牵动流程、协作、认知与基础设施。",
    signals: ["tool", "workflow", "organization", "cognition", "infrastructure"],
  },
  {
    stage: "recursion",
    kicker: "recursion",
    title: "系统开始设计自身被重构的条件。",
    body: "输出重新成为输入。界面不再只是控制面板，而是反馈、观察与自我修正的表面。",
    signals: ["output", "input", "feedback", "revision"],
  },
  {
    stage: "selfReference",
    kicker: "self-reference",
    title: "一个系统，正在观察改变它的系统。",
    body: "This page says this once: it describes a changed interface by behaving like one.",
  },
  {
    stage: "reconstruction",
    kicker: "reconstruction",
    title: "不是给旧结构加上 AI，而是为它重建空间。",
    body: "noobli 在品味、前端纪律、WebGL、递归工作流与 agentic tools 交界处工作。旧界面不爆炸，它让出空间。",
    signals: ["taste", "frontend", "webgl", "recursive workflows", "agentic tools"],
    cta: {
      href: "https://github.com/noobli",
      label: "开始交流",
    },
  },
];
