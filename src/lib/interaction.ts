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
  rawScrollProgress: number;
  scrollProgress: number;
  stageIndex: number;
  stageProgress: number;
  scrollVelocity: number;
}

export interface RecursiveFossilMaterialState {
  threshold: number;
  engraving: number;
  feedback: number;
  compression: number;
  signal: number;
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
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

export function getCinematicScrollStage(progress: number): {
  stage: ScrollStage;
  stageProgress: number;
} {
  const base = getScrollStage(progress);
  const held = clamp01((base.stageProgress - 0.14) / 0.72);
  const eased = held * held * held * (held * (held * 6 - 15) + 10);

  return {
    stage: base.stage,
    stageProgress: eased,
  };
}

export function getStageIndex(stage: ScrollStage): number {
  return SCROLL_STAGES.indexOf(stage);
}

export function deriveRecursiveFossilMaterialState(
  sceneState: SceneState,
  options: { reducedMotion?: boolean } = {},
): RecursiveFossilMaterialState {
  const stageIndex = Math.max(0, Math.min(SCROLL_STAGES.length - 1, sceneState.stageIndex));
  const stageProgress = clamp01(sceneState.stageProgress);
  const scrollProgress = clamp01(sceneState.scrollProgress);
  const velocity = options.reducedMotion ? 0 : clamp01(Math.abs(sceneState.scrollVelocity));
  const stageT = clamp01(stageIndex / Math.max(SCROLL_STAGES.length - 1, 1));

  const causality = stageIndex >= 1 ? 0.36 + stageProgress * 0.28 : stageProgress * 0.16;
  const recursion = stageIndex >= 2 ? 0.42 + stageProgress * 0.34 : 0;
  const selfReference = stageIndex >= 3 ? 0.34 + stageProgress * 0.34 : 0;
  const reconstruction = stageIndex >= 4 ? stageProgress : 0;

  return {
    threshold: clamp01(0.18 + stageT * 0.46 + velocity * 0.1),
    engraving: clamp01(0.1 + causality + reconstruction * 0.22),
    feedback: clamp01(0.04 + recursion + selfReference * 0.26 + velocity * 0.22),
    compression: clamp01(0.1 + recursion * 0.7 + velocity * 0.28 - reconstruction * 0.42),
    signal: clamp01(0.12 + scrollProgress * 0.58 + reconstruction * 0.3),
  };
}
