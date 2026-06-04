import type { ScrollStage } from "@/lib/interaction";

export interface HomepageSection {
  stage: ScrollStage;
  kicker: string;
  title: string;
  body: string;
  cta?: {
    href: string;
    label: string;
  };
}

export const homepageSections: HomepageSection[] = [
  {
    stage: "observation",
    kicker: "观察",
    title: "重构递归智能界面。",
    body: "我曾在旧的前端系统里工作。现在更关心软件为谁而建，以及它如何为 AI 留出位置。",
  },
  {
    stage: "causality",
    kicker: "因果",
    title: "工具改变工作流，工作流改变组织。",
    body: "工具改变流程。流程改变协作。协作改变认知。认知最终改变世界。",
  },
  {
    stage: "recursion",
    kicker: "递归",
    title: "系统开始设计自身被重构的条件。",
    body: "输出重新成为输入。界面不再只是操作面板，而是反馈、观察与自我修正的表面。",
  },
  {
    stage: "selfReference",
    kicker: "自指",
    title: "一个系统，正在观察改变它的系统。",
    body: "这个页面描述 AI 如何改变界面，同时让自己也像一个被改变后的界面那样运作。",
  },
  {
    stage: "reconstruction",
    kicker: "重构",
    title: "不是给旧结构加上 AI，而是重建空间。",
    body: "复杂度不会消失。稀缺的能力会转向目标定义、系统治理，以及让人和 AI 都能理解的结构。",
    cta: {
      href: "#",
      label: "开始交流",
    },
  },
];
