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
    kicker: "prologue / valley",
    title: "我在梦里看见一个界面，像山谷一样安静。",
    body: "它不是旧屏幕上的新按钮。它是一处被 AI 轻轻改写的地形，先观察，再回应。",
  },
  {
    stage: "causality",
    kicker: "where tools flow",
    title: "工具不是入口，工具是水源。",
    body: "一次调用改变工作流，工作流改变组织，组织再改变人如何感知世界。界面在山谷里记录这些水路。",
    signals: ["tool", "workflow", "organization", "cognition", "terrain"],
  },
  {
    stage: "recursion",
    kicker: "recursion",
    title: "回声返回石面，递归开始生长。",
    body: "输出重新成为输入。每一次反馈都像雾里的一道刻痕，让系统看见自己如何被重写。",
    signals: ["echo", "input", "feedback", "revision"],
  },
  {
    stage: "selfReference",
    kicker: "self-reference",
    title: "梦正在观察造梦的机器。",
    body: "This page says this once: an interface can describe change by becoming the place where change is visible.",
  },
  {
    stage: "reconstruction",
    kicker: "reconstruction",
    title: "旧界面没有消失，它在山谷深处让出空间。",
    body: "noobli 在品味、前端纪律、WebGL、递归工作流与 agentic tools 之间工作。新的界面不是覆盖旧结构，而是让梦有地方运行。",
    signals: ["taste", "frontend", "webgl", "recursive valley", "agentic tools"],
    cta: {
      href: "https://github.com/noobli",
      label: "进入山谷",
    },
  },
];
