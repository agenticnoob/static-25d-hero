export interface NarrativeCameraPose {
  position: [number, number, number];
  target: [number, number, number];
  roll: number;
}

interface CameraPathProfile {
  radiusBase: number;
  radiusAmp: number;
  heightBase: number;
  heightAmp: number;
  targetAmpX: number;
  targetAmpY: number;
}

const DESKTOP_PROFILE: CameraPathProfile = {
  radiusBase: 2.76,
  radiusAmp: 0.48,
  heightBase: 1.14,
  heightAmp: 0.42,
  targetAmpX: 0.18,
  targetAmpY: 0.07,
};

const COMPACT_PROFILE: CameraPathProfile = {
  radiusBase: 2.12,
  radiusAmp: 0.44,
  heightBase: 0.94,
  heightAmp: 0.22,
  targetAmpX: 0.1,
  targetAmpY: 0.045,
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function smootherstep01(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function segmentValue(values: readonly number[], progress: number): number {
  const maxIndex = values.length - 1;
  const scaled = clamp01(progress) * maxIndex;
  const index = Math.min(maxIndex - 1, Math.floor(scaled));
  const local = smootherstep01(scaled - index);
  return lerp(values[index], values[index + 1], local);
}

export function sampleNarrativeCameraPose(
  progressValue: number,
  isCompact: boolean,
): NarrativeCameraPose {
  const progress = clamp01(progressValue);
  const profile = isCompact ? COMPACT_PROFILE : DESKTOP_PROFILE;

  const orbit = segmentValue([0.64, -0.42, -0.2, -0.72, 0.48], progress);
  const dolly = segmentValue([0.3, -0.28, -0.62, -0.12, 0.34], progress);
  const height = segmentValue([0.42, 0.08, -0.16, -0.34, 0.2], progress);
  const targetX = segmentValue([0, 0.18, 0.05, -0.14, 0], progress);
  const targetY = segmentValue([0.02, 0, -0.035, -0.06, 0.01], progress);
  const targetZ = segmentValue([0, -0.05, 0.02, 0.055, 0], progress);
  const roll = segmentValue([0, -0.026, 0.038, -0.02, 0], progress);

  const radius = profile.radiusBase + dolly * profile.radiusAmp;
  const x = Math.sin(orbit) * radius;
  const z = Math.cos(orbit) * radius;
  const y = profile.heightBase + height * profile.heightAmp;

  return {
    position: [x, y, z],
    target: [
      targetX * profile.targetAmpX,
      targetY * profile.targetAmpY,
      targetZ * profile.targetAmpX,
    ],
    roll,
  };
}
