import { create } from "zustand";
import { SCROLL_STAGES, type PointerState } from "@/lib/interaction";

export type SceneMode = (typeof SCROLL_STAGES)[number] | "idle";

interface ViewportState {
  width: number;
  height: number;
  dpr: number;
  isTouch: boolean;
}

interface SceneStatePayload {
  rawScrollProgress: number;
  scrollProgress: number;
  stageIndex: number;
  stageProgress: number;
  scrollVelocity: number;
}

interface HeroState {
  pointerTarget: PointerState;
  pointerCurrent: PointerState;
  pointerActive: boolean;

  rawScrollProgress: number;
  scrollProgress: number;
  stageIndex: number;
  stageProgress: number;
  scrollVelocity: number;

  sceneMode: SceneMode;
  viewport: ViewportState;

  reducedMotion: boolean;
  touchDevice: boolean;

  setPointerTarget: (next: PointerState) => void;
  setPointerCurrent: (next: PointerState) => void;
  setPointerActive: (active: boolean) => void;

  setSceneState: (next: SceneStatePayload) => void;
  setSceneMode: (mode: SceneMode) => void;

  setViewport: (next: ViewportState) => void;
  setPrefersReducedMotion: (enabled: boolean) => void;
  setTouchDevice: (enabled: boolean) => void;
}

export const useHeroStore = create<HeroState>((set) => ({
  pointerTarget: { x: 0, y: 0 },
  pointerCurrent: { x: 0, y: 0 },
  pointerActive: false,

  rawScrollProgress: 0,
  scrollProgress: 0,
  stageIndex: 0,
  stageProgress: 0,
  scrollVelocity: 0,

  sceneMode: "idle",
  viewport: { width: 0, height: 0, dpr: 1, isTouch: false },

  reducedMotion: false,
  touchDevice: false,

  setPointerTarget: (next) => set({ pointerTarget: next }),
  setPointerCurrent: (next) => set({ pointerCurrent: next }),
  setPointerActive: (active) => set({ pointerActive: active }),

  setSceneState: (next) =>
    set({
      rawScrollProgress: next.rawScrollProgress,
      scrollProgress: next.scrollProgress,
      stageIndex: next.stageIndex,
      stageProgress: next.stageProgress,
      scrollVelocity: next.scrollVelocity,
    }),

  setSceneMode: (mode) => set({ sceneMode: mode }),

  setViewport: (next) => set({ viewport: next }),
  setPrefersReducedMotion: (enabled) => set({ reducedMotion: enabled }),
  setTouchDevice: (enabled) => set({ touchDevice: enabled }),
}));
