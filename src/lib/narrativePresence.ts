export interface NarrativePresenceInput {
  index: number;
  sectionTop: number;
  sectionHeight: number;
  viewportHeight: number;
  scrollY: number;
}

export interface NarrativePresenceState {
  progress: number;
  presence: number;
  direction: 1 | -1;
  offsetY: number | null;
}

const WARP_STAGE = {
  enter: 0.02,
  start: 0.2,
  exit: 0.58,
  vanish: 0.9,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export function getNarrativePresence(input: NarrativePresenceInput): NarrativePresenceState {
  const viewportHeight = Math.max(input.viewportHeight, 1);
  const sectionHeight = Math.max(input.sectionHeight, 1);
  const rectTravel = Math.max(sectionHeight + viewportHeight, 1);
  let progress = clamp((viewportHeight - input.sectionTop) / rectTravel, 0, 1);

  if (input.index === 0) {
    const firstTravel = Math.max(sectionHeight, viewportHeight * 1.25);
    const firstExitDistance = Math.min(760, Math.max(520, viewportHeight * 0.72));
    progress = clamp(input.scrollY / firstTravel, 0, 1);
    return {
      progress,
      presence: 1 - smoothstep(0.84, 0.99, progress),
      direction: -1,
      offsetY: progress === 0 ? 0 : -progress * firstExitDistance,
    };
  }

  const enter = smoothstep(WARP_STAGE.enter, WARP_STAGE.start, progress);
  const exit = smoothstep(WARP_STAGE.exit, WARP_STAGE.vanish, progress);
  const presence = enter * (1 - exit);
  const enterOffset = (1 - enter) * 24;
  const exitOffset = -exit * Math.min(112, Math.max(72, viewportHeight * 0.1));

  return {
    progress,
    presence,
    direction: progress < 0.5 ? 1 : -1,
    offsetY: enterOffset + exitOffset,
  };
}
