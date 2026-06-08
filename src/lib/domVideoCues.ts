export type DomVideoCueMode = "ambient-loop" | "enter-animation" | "play-on-visible";

export interface DomVideoCue {
  id: string;
  mode: DomVideoCueMode;
  src: string;
  top: string;
  width: string;
  x: string;
  y: string;
  loop: boolean;
  preloadRootMargin: string;
  playRootMargin: string;
  className?: string;
}

export const DOM_VIDEO_CUES: DomVideoCue[] = [
  {
    id: "birds-rise",
    mode: "enter-animation",
    src: "/video/birds_02-c.mp4",
    top: "16%",
    width: "clamp(180px, 28vw, 420px)",
    x: "12vw",
    y: "18svh",
    loop: true,
    preloadRootMargin: "70% 0px",
    playRootMargin: "0px 0px -12% 0px",
    className: "video-cue--birds-rise",
  },
];
