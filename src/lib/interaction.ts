export const SCROLL_STAGES = [
  "observation",
  "causality",
  "recursion",
  "selfReference",
  "reconstruction",
] as const;

export type ScrollStage = (typeof SCROLL_STAGES)[number];

export interface PointerState {
  x: number;
  y: number;
}

export interface ScrollState {
  y: number;
  progress: number;
  stage: ScrollStage;
  stageProgress: number;
}

export interface InteractionState {
  pointer: PointerState;
  pointerCurrent: PointerState;
  scroll: ScrollState;
}

export interface SceneState {
  scrollProgress: number;
  stageIndex: number;
  stageProgress: number;
  slabDropPx: number;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getScrollStage(progress: number): {
  stage: ScrollStage;
  stageProgress: number;
} {
  const p = clamp01(progress);
  const count = SCROLL_STAGES.length;
  const scaled = p * count;
  const index = Math.min(count - 1, Math.floor(scaled));
  const stageStart = index / count;
  const stageEnd = (index + 1) / count;
  const stageProgress = clamp01((p - stageStart) / (stageEnd - stageStart));

  return {
    stage: SCROLL_STAGES[index],
    stageProgress,
  };
}

export function getStageIndex(stage: ScrollStage): number {
  return SCROLL_STAGES.indexOf(stage);
}
