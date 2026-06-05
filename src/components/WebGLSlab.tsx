"use client";

import {
  useRef,
  useMemo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { SceneState } from "@/lib/interaction";

/* ─────────────────────────────────────────────────────────────────
   Background shader — replaces CSS bg layers:
     deep-space radial gradient, 64px grid, atmospheric glow
   Rendered on an orthographic full-screen quad (fixed, no perspective).
   ───────────────────────────────────────────────────────────────── */

const bgVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    /* NDC fullscreen quad: ignore camera, always fill the screen at far depth.
       position.xy in -1..1 maps directly to clip space, so the quad
       covers the entire viewport regardless of camera position or FOV. */
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const bgFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float lineField(vec2 uv, float y, float width) {
    float line = 1.0 - smoothstep(0.0, width, abs(uv.y - y));
    float fade = smoothstep(0.04, 0.46, uv.x) * (1.0 - smoothstep(0.56, 0.98, uv.x));
    return line * fade;
  }

  void main() {
    vec2 p = vUv - vec2(0.5);
    float radial = length(p * vec2(0.92, 1.18));
    float floorFalloff = smoothstep(0.18, 0.78, vUv.y);

    vec3 deep = vec3(0.028, 0.033, 0.050);
    vec3 top = vec3(0.063, 0.073, 0.095);
    vec3 col = mix(top, deep, smoothstep(0.05, 0.86, radial));

    float horizon = exp(-abs(vUv.y - 0.47) * 7.0) * smoothstep(0.02, 0.48, vUv.x) * (1.0 - smoothstep(0.52, 0.98, vUv.x));
    col += vec3(0.16, 0.19, 0.21) * horizon * 0.105;

    float shelfA = lineField(vUv, 0.435, 0.006);
    float shelfB = lineField(vUv, 0.505, 0.010);
    float shelfC = lineField(vUv, 0.585, 0.016);
    col += vec3(0.50, 0.50, 0.47) * (shelfA * 0.025 + shelfB * 0.016 + shelfC * 0.010) * (1.0 - floorFalloff * 0.45);

    float vignette = smoothstep(0.92, 0.26, radial);
    col *= 0.72 + vignette * 0.36;

    float grain = hash(floor(vUv * vec2(1280.0, 720.0)));
    col += (grain - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Slab vertex shader
   ───────────────────────────────────────────────────────────────── */

const slabVert = /* glsl */ `
  uniform float uTime;
  uniform float uInertia;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vWarp;

  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 p = position;
    float topMask = smoothstep(-0.10, 0.62, normal.y);
    vec2 centered = uv - vec2(0.5);
    float feedbackWave = sin((uv.x * 2.0 + uv.y * 1.35 + uTime * 0.10) * 6.28318);
    float shear = centered.x * 0.018 + centered.y * 0.010;
    vWarp = topMask * (feedbackWave * 0.004 + shear * 0.002) * (1.0 + uInertia * 0.18);

    p.y += vWarp * (1.0 + uInertia * 0.45);
    p.z += vWarp * 0.35;
    p.x += vWarp * 0.24;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Slab fragment shader
   ───────────────────────────────────────────────────────────────── */

const slabFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform float uInertia;
  uniform float uImpact;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vWarp;

  float grid(vec2 uv, float spacing) {
    vec2 g = abs(fract(uv / spacing - 0.5) / fwidth(uv / spacing));
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),               hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    vec3 col = vec3(0.075, 0.080, 0.082);
    col += noise(vUv * 86.0) * 0.026;
    col += noise(vUv * 220.0) * 0.010;
    col += vec3(0.58, 0.56, 0.50) * clamp(vWarp * 1.8, -0.014, 0.024);

    float g1 = grid(vUv, 0.165) * 0.018;
    float g2 = grid(vUv, 0.041) * 0.004;

    float diag = smoothstep(0.46, 0.50, abs(vUv.x - vUv.y)) * 0.04;
    diag *= step(0.1, vUv.x) * step(vUv.x, 0.9)
          * step(0.1, vUv.y) * step(vUv.y, 0.9);

    col += vec3(0.42, 0.40, 0.35) * max(g1, g2) * 0.45
         + vec3(0.46, 0.44, 0.38) * diag * 0.09;

    float edgeDist = min(vUv.y, 1.0 - vUv.y);
    float edge = 1.0 - smoothstep(0.0, 0.075, edgeDist);
    col -= vec3(0.05, 0.05, 0.045) * edge * 0.50;
    col += vec3(0.82, 0.78, 0.66) * edge * 0.16;

    vec3 lightDir = normalize(vec3(0.2, 1.0, 0.4));
    float diffuse = clamp(dot(vNormal, lightDir), 0.0, 1.0);
    float underside = smoothstep(-0.74, 0.15, vNormal.y);
    col *= 0.46 + underside * 0.66;
    col += vec3(0.26, 0.25, 0.21) * diffuse * 0.30;

    float dist  = abs(vUv.y - 0.5);
    float pulse = 0.48 + sin(uTime * 0.16 + vUv.x * 6.28318) * 0.52;
    float glow  = clamp(1.0 - dist / 0.22, 0.0, 1.0) * pulse * 0.010;
    col += vec3(0.78, 0.74, 0.64) * glow;

    float observeSweep = 1.0 - smoothstep(0.004, 0.018, abs(vUv.x - (0.5 + uMouse.x * 0.09 + sin(uTime * 0.35 + vUv.y * 8.0) * 0.008)));
    float observeNode = 1.0 - smoothstep(0.008, 0.020, abs(vUv.y - (0.5 + uMouse.y * 0.05 + cos(uTime * 0.28 + vUv.x * 8.0) * 0.005)));
    col += vec3(0.86, 0.82, 0.72) * (observeSweep * 0.20 + observeNode * 0.08) * (0.25 + 1.0 * uInertia) * 0.020;

    float impactRim = 1.0 - smoothstep(0.0, 0.34, length(vUv - vec2(0.5, 0.5)));
    float impactGlint = pow(max(vNormal.y, 0.0), 2.0) * impactRim * uImpact;
    float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.0);
    float rim = pow(fresnel, 1.45);
    col += vec3(0.92, 0.88, 0.78) * rim * 0.105;
    col += vec3(1.0, 0.96, 0.86) * impactGlint * 0.34;
    col -= vec3(0.04, 0.04, 0.035) * (1.0 - fresnel) * (0.34 + uImpact * 0.54);
    col += vec3(0.86, 0.82, 0.72) * clamp(abs(uImpact), 0.0, 1.0) * (0.8 - fresnel) * 0.08;

    float traceA = 1.0 - smoothstep(0.004, 0.018, abs(vUv.y - (0.32 + floor(vUv.x * 5.0) * 0.058)));
    float traceB = 1.0 - smoothstep(0.006, 0.022, abs(vUv.x - (0.22 + floor(vUv.y * 4.0) * 0.075)));
    float traceC = 1.0 - smoothstep(0.008, 0.026, abs(vUv.y - 0.5));
    float chainPulse = 0.64 + sin(uTime * 0.42 + vUv.x * 6.28318) * 0.36;
    float traceNodes =
      (1.0 - smoothstep(0.012, 0.038, length(vUv - vec2(0.13, 0.30)))) +
      (1.0 - smoothstep(0.012, 0.038, length(vUv - vec2(0.88, 0.59)))) +
      (1.0 - smoothstep(0.010, 0.034, length(vUv - vec2(0.58, 0.48))));
    col += vec3(0.64, 0.61, 0.52) * (traceA * 0.018 + traceB * 0.014 + traceC * 0.008) * chainPulse;
    col += vec3(0.86, 0.82, 0.72) * traceNodes * 0.012;

    float mirrorLine = 1.0 - smoothstep(0.002, 0.014, abs(vUv.x - 0.5));
    float mirrorEcho = 1.0 - smoothstep(0.012, 0.060, abs(vUv.x - (1.0 - vUv.y * 0.18 - 0.41)));
    float lens = exp(-length((vUv - vec2(0.5, 0.52)) * vec2(1.4, 0.85)) * 3.2);
    vec2 mirrorTrace = vec2(1.0 - vUv.y, vUv.x);
    float feedbackBand = 1.0 - smoothstep(0.008, 0.020, length(vUv - mirrorTrace));
    col += vec3(0.84, 0.80, 0.70) * mirrorLine * 0.018;
    col += vec3(0.58, 0.57, 0.52) * mirrorEcho * lens * 0.022;
    col += vec3(0.70, 0.68, 0.61) * feedbackBand * 0.008;
    col -= vec3(0.10, 0.10, 0.09) * lens * 0.026;

    vec2 n1 = vec2(0.21, 0.31);
    vec2 n2 = vec2(0.39, 0.66);
    vec2 n3 = vec2(0.61, 0.39);
    vec2 n4 = vec2(0.80, 0.72);
    vec2 n5 = vec2(0.50, 0.28);
    float network =
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n1, n2))) +
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n2, n3))) +
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n3, n4))) +
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n1, n5))) +
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n5, n3)));
    float nodes =
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n1))) +
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n2))) +
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n3))) +
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n4))) +
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n5)));
    col += vec3(0.68, 0.66, 0.58) * network * 0.020;
    col += vec3(0.86, 0.82, 0.72) * nodes * 0.024;
    col += vec3(0.70, 0.68, 0.60) * grid(vUv + vec2(0.012, -0.008), 0.16) * 0.006;
    col = clamp(col, vec3(0.0), vec3(1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Camera narrative constants
   ───────────────────────────────────────────────────────────────── */

export const REST_TILT_Y = 0.18;

const CAMERA_SETTINGS = {
  compact: [1.05, 1.08, 2.42] as [number, number, number],
  desktop: [1.68, 1.44, 3.25] as [number, number, number],
  fov: 48,
  near: 0.1,
  far: 60,
};

const CAMERA_RAIL_DESKTOP = [
  { position: new THREE.Vector3(1.68, 1.44, 3.25), target: new THREE.Vector3(0.00, 0.02, 0.00), roll: 0.00 },
  { position: new THREE.Vector3(2.12, 1.18, 2.72), target: new THREE.Vector3(0.18, 0.00, -0.04), roll: -0.025 },
  { position: new THREE.Vector3(0.78, 0.92, 2.02), target: new THREE.Vector3(0.08, -0.02, 0.00), roll: 0.035 },
  { position: new THREE.Vector3(-0.52, 0.62, 1.76), target: new THREE.Vector3(-0.10, -0.04, 0.03), roll: -0.018 },
  { position: new THREE.Vector3(1.28, 1.22, 2.96), target: new THREE.Vector3(0.00, 0.01, 0.00), roll: 0.00 },
] as const;

const CAMERA_RAIL_COMPACT = [
  { position: new THREE.Vector3(1.05, 1.08, 2.42), target: new THREE.Vector3(0.00, 0.02, 0.00), roll: 0.00 },
  { position: new THREE.Vector3(1.38, 0.98, 2.18), target: new THREE.Vector3(0.10, 0.00, -0.03), roll: -0.018 },
  { position: new THREE.Vector3(0.42, 0.84, 1.88), target: new THREE.Vector3(0.05, -0.03, 0.00), roll: 0.020 },
  { position: new THREE.Vector3(-0.36, 0.70, 1.82), target: new THREE.Vector3(-0.08, -0.04, 0.02), roll: -0.012 },
  { position: new THREE.Vector3(0.92, 1.00, 2.34), target: new THREE.Vector3(0.00, 0.01, 0.00), roll: 0.00 },
] as const;

function smoothstep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function sampleCameraRail(
  sceneState: SceneState,
  isCompact: boolean,
): { position: THREE.Vector3; target: THREE.Vector3; roll: number } {
  const rail = isCompact ? CAMERA_RAIL_COMPACT : CAMERA_RAIL_DESKTOP;
  const index = Math.max(0, Math.min(rail.length - 1, sceneState.stageIndex));
  const nextIndex = Math.min(rail.length - 1, index + 1);
  const t = smoothstep01(sceneState.stageProgress);
  const current = rail[index];
  const next = rail[nextIndex];

  return {
    position: current.position.clone().lerp(next.position, t),
    target: current.target.clone().lerp(next.target, t),
    roll: THREE.MathUtils.lerp(current.roll, next.roll, t),
  };
}

const ROOM_OBJECT_SETTINGS = {
  slabGeometryScaleBaseFactor: 0.82,
  slabCompactScale: 0.86,
  objectScaleMax: 0.56,
  objectScaleMin: 0.24,
  viewportScaleMin: 0.38,
  viewportScaleMax: 0.62,
  viewportScaleDivisor: 4.2,
  viewportScaleMul: 0.62,
};

class SlabViewportProfile {
  constructor(private readonly width: number) {}

  get isCompact(): boolean {
    return this.width < 4;
  }

  get compactScale(): number {
    return this.isCompact ? ROOM_OBJECT_SETTINGS.slabCompactScale : 1;
  }

  get objectScale(): number {
    const slabScale = Math.min(
      ROOM_OBJECT_SETTINGS.viewportScaleMax,
      Math.max(
        ROOM_OBJECT_SETTINGS.viewportScaleMin,
        (this.width / ROOM_OBJECT_SETTINGS.viewportScaleDivisor) * ROOM_OBJECT_SETTINGS.viewportScaleMul
      )
    );

    return Math.min(
      ROOM_OBJECT_SETTINGS.objectScaleMax,
      Math.max(
        ROOM_OBJECT_SETTINGS.objectScaleMin,
        slabScale * ROOM_OBJECT_SETTINGS.slabGeometryScaleBaseFactor
      )
    );
  }
}

function createRecursiveCoreGeometry(): THREE.BufferGeometry {
  const outline = new THREE.Shape();

  outline.moveTo(-0.56, -1.24);
  outline.lineTo(0.48, -1.20);
  outline.bezierCurveTo(0.58, -1.06, 0.63, -0.74, 0.60, -0.38);
  outline.lineTo(0.55, 0.82);
  outline.bezierCurveTo(0.50, 1.08, 0.36, 1.24, 0.16, 1.30);
  outline.lineTo(-0.18, 1.24);
  outline.bezierCurveTo(-0.44, 1.18, -0.57, 0.98, -0.61, 0.70);
  outline.lineTo(-0.66, -0.70);
  outline.bezierCurveTo(-0.67, -0.98, -0.64, -1.15, -0.56, -1.24);

  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: 0.46,
    bevelEnabled: true,
    bevelSegments: 5,
    bevelSize: 0.045,
    bevelThickness: 0.055,
    curveSegments: 18,
    steps: 1,
  });

  geometry.center();
  geometry.rotateY(-0.035);
  geometry.rotateZ(0.035);
  geometry.scale(1.08, 1.04, 1.0);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

function createLinePathGeometry(points: Array<[number, number]>): THREE.BufferGeometry {
  const vertices: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    vertices.push(x1, y1, 0.252, x2, y2, 0.252);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  return geometry;
}

const STELA_INSET_PANELS = [
  { position: [0.00, 0.34, 0.246], scale: [0.74, 0.56, 0.018] },
  { position: [0.03, 0.06, 0.258], scale: [0.54, 0.34, 0.020] },
  { position: [0.07, -0.10, 0.270], scale: [0.34, 0.18, 0.022] },
  { position: [-0.11, -0.60, 0.248], scale: [0.58, 0.42, 0.014] },
  { position: [-0.08, -0.62, 0.262], scale: [0.40, 0.24, 0.018] },
] as const;

const STELA_RIDGE_PANELS = [
  { position: [-0.46, 0.10, 0.286], scale: [0.040, 1.55, 0.040] },
  { position: [0.46, -0.12, 0.280], scale: [0.038, 1.18, 0.036] },
  { position: [-0.05, 1.03, 0.276], scale: [0.52, 0.042, 0.034] },
  { position: [0.02, -1.02, 0.278], scale: [0.72, 0.050, 0.038] },
] as const;

const STELA_LINE_PATHS: Array<Array<[number, number]>> = [
  [[-0.31, 0.55], [-0.12, 0.55], [-0.12, 0.36], [0.20, 0.36], [0.20, 0.10], [-0.02, 0.10]],
  [[0.29, 0.48], [0.06, 0.48], [0.06, 0.22], [-0.22, 0.22], [-0.22, -0.02], [0.12, -0.02]],
  [[-0.30, -0.48], [0.21, -0.48], [0.21, -0.68], [-0.05, -0.68], [-0.05, -0.82], [-0.27, -0.82]],
  [[-0.40, -0.92], [-0.40, 0.76], [-0.24, 0.76], [-0.24, 0.64]],
  [[0.39, -0.70], [0.39, 0.82], [0.18, 0.82], [0.18, 0.66]],
];

function createSlabUniforms(): SlabUniforms {
  return {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uInertia: { value: 0 },
    uImpact: { value: 0 },
  };
}

function applySlabUniforms(
  uniforms: SlabUniforms,
  options: {
    clock: { getElapsedTime: () => number };
    impact: number;
    inertia: number;
    interactionState: CoreInteractionState;
    reducedMotion: boolean;
  }
): void {
  if (!uniforms) {
    return;
  }

  const uMouse = uniforms.uMouse;
  const uInertia = uniforms.uInertia;
  const uImpact = uniforms.uImpact;
  const uTime = uniforms.uTime;

  if (
    !uMouse ||
    !uInertia ||
    !uImpact ||
    !uTime
  ) {
    return;
  }

  if (!uMouse.value || !(uMouse.value instanceof THREE.Vector2)) {
    uMouse.value = new THREE.Vector2(0, 0);
  }

  if (typeof uInertia.value !== "number") {
    uInertia.value = 0;
  }
  if (typeof uImpact.value !== "number") {
    uImpact.value = 0;
  }
  if (typeof uTime.value !== "number") {
    uTime.value = 0;
  }

  uMouse.value.set(
    options.interactionState.pos.x * 1.6,
    options.interactionState.pos.y * 1.6
  );
  uInertia.value = options.reducedMotion ? 0 : options.inertia;
  uImpact.value = options.impact;
  uTime.value = options.reducedMotion
    ? 0
    : options.clock.getElapsedTime();
}

/* ─────────────────────────────────────────────────────────────────
   WebGLSlab
   ─────────────────────────────────────────────────────────────────

   All pointer tracking is handled by Hero.tsx (window-level pointermove).
   This component only renders: background quad + slab mesh.

   Background quad uses an orthographic camera so it stays fixed
   regardless of the main perspective camera.
   ───────────────────────────────────────────────────────────────── */

interface WebGLSlabProps {
  coreInteractionRef: React.MutableRefObject<CoreInteractionState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
}

export default function WebGLSlab({ coreInteractionRef, sceneStateRef }: WebGLSlabProps) {
  const invalidateRef = useRef<() => void>(() => {});

  const slabUniforms = useMemo(
    () => createSlabUniforms(),
    []
  );

  const isTouch = useRef(
    typeof window !== "undefined" &&
    (window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
     "ontouchstart" in window)
  );
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const isCompactViewport = typeof window === "undefined" ? false : window.innerWidth < 768;
  const cameraPos: [number, number, number] = isCompactViewport
    ? CAMERA_SETTINGS.compact
    : CAMERA_SETTINGS.desktop;

  const dpr: [number, number] = isTouch.current ? ([1, 1] as const) : ([1, 2] as const);

  return (
    <div
      className="webgl-stage"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        overflow: "hidden",
      }}
    >
      <Canvas
        shadows
        dpr={dpr}
        frameloop="always"
        gl={{
          antialias: !isTouch.current,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          background: "transparent",
        }}
        onCreated={({ invalidate: inv }) => { invalidateRef.current = inv; }}
      >
        <PerspectiveCamera
          makeDefault
          position={cameraPos}
          fov={CAMERA_SETTINGS.fov}
          near={CAMERA_SETTINGS.near}
          far={CAMERA_SETTINGS.far}
        />
        <fog args={["#0A0C12", 1.95, 20.2]} />

        {/* NDC fullscreen background quad — fixed, no perspective */}
        <BgQuad />

        <SlabMesh
          slabUniforms={slabUniforms}
          coreInteractionRef={coreInteractionRef}
          sceneStateRef={sceneStateRef}
          invalidateRef={invalidateRef}
          prefersReducedMotion={prefersReducedMotion.current}
          cameraBasePosition={cameraPos}
        />
      </Canvas>
    </div>
  );
}
/* ─────────────────────────────────────────────────────────────────
   Pointer material state shape
   ───────────────────────────────────────────────────────────────── */

export interface CoreInteractionState {
  pos:    THREE.Vector2;
  vel:    THREE.Vector2;
  target: THREE.Vector2;
  active: boolean;
}

/* ─────────────────────────────────────────────────────────────────
   BgQuad — orthographic full-screen background
   Renders deep-space gradient + grid + atmospheric glow.
   Orthographic camera means it never moves with perspective.
   ───────────────────────────────────────────────────────────────── */

const BG_UNIFORMS = {};

function BgQuad() {
  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={bgVert}
        fragmentShader={bgFrag}
        uniforms={BG_UNIFORMS}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SlabMesh
   ───────────────────────────────────────────────────────────────── */

interface SlabUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uMouse: { value: THREE.Vector2 };
  uInertia: { value: number };
  uImpact: { value: number };
}

interface SlabMeshProps {
  slabUniforms: SlabUniforms;
  coreInteractionRef: React.MutableRefObject<CoreInteractionState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
  invalidateRef: React.MutableRefObject<() => void>;
  prefersReducedMotion: boolean;
  cameraBasePosition: [number, number, number];
}

function SlabMesh({
  slabUniforms,
  coreInteractionRef,
  sceneStateRef,
  invalidateRef,
  prefersReducedMotion,
  cameraBasePosition: _cameraBasePosition,
}: SlabMeshProps) {
  void _cameraBasePosition;
  const slabMatRef = useRef<THREE.ShaderMaterial>(null);
  const coreRef = useRef<THREE.Group>(null);
  const cameraPositionRef = useRef(new THREE.Vector3());
  const cameraTargetRef = useRef(new THREE.Vector3());
  const pointerRef = useRef(new THREE.Vector2(0, 0));
  const { viewport, camera } = useThree();
  const viewportProfile = useMemo(
    () => new SlabViewportProfile(viewport.width),
    [viewport.width]
  );
  const objectScale = viewportProfile.objectScale;
  const compactScale = viewportProfile.compactScale;
  const recursiveCoreGeometry = useMemo(
    () => createRecursiveCoreGeometry(),
    []
  );
  const engravingGeometries = useMemo(
    () => STELA_LINE_PATHS.map((path) => createLinePathGeometry(path)),
    []
  );

  useFrame(({ clock }) => {
    const p = coreInteractionRef.current;
    const sceneState = sceneStateRef.current;
    const railPose = sampleCameraRail(sceneState, viewportProfile.isCompact);
    if (cameraPositionRef.current.lengthSq() === 0) {
      cameraPositionRef.current.copy(railPose.position);
      cameraTargetRef.current.copy(railPose.target);
    }
    const pointer = pointerRef.current;
    const pointerEase = prefersReducedMotion ? 1 : 0.075;
    const pointerX = prefersReducedMotion ? 0 : p.target.x;
    const pointerY = prefersReducedMotion ? REST_TILT_Y : p.target.y;

    pointer.x += (pointerX - pointer.x) * pointerEase;
    pointer.y += (pointerY - pointer.y) * pointerEase;
    p.pos.set(pointer.x, pointer.y);
    p.vel.set(0, 0);

    const parallaxScale = viewportProfile.isCompact ? 0.035 : 0.055;
    const targetPosition = railPose.position.clone().add(
      new THREE.Vector3(pointer.x * parallaxScale, pointer.y * parallaxScale * 0.45, 0)
    );
    const targetLookAt = railPose.target.clone().add(
      new THREE.Vector3(pointer.x * 0.045, pointer.y * 0.025, 0)
    );

    cameraPositionRef.current.lerp(targetPosition, 0.085);
    cameraTargetRef.current.lerp(targetLookAt, 0.095);
    camera.position.copy(cameraPositionRef.current);
    camera.lookAt(cameraTargetRef.current);
    camera.rotation.z += railPose.roll;

    if (coreRef.current) {
      const stageBias = sceneState.stageIndex - 2;
      coreRef.current.position.set(0, 0, 0);
      coreRef.current.rotation.set(
        REST_TILT_Y * 0.42 + stageBias * 0.018,
        -0.18 + sceneState.scrollProgress * 0.36,
        0.06 - stageBias * 0.012,
      );
    }

    const activeUniforms = slabMatRef.current?.uniforms ?? slabUniforms;
    const velocityEnergy = Math.min(1, Math.abs(sceneState.scrollVelocity) * 0.75);
    const pointerEnergy = Math.min(1, pointer.length() * 0.85);
    if (activeUniforms) {
      applySlabUniforms(activeUniforms as SlabUniforms, {
        clock,
        impact: velocityEnergy * 0.22,
        inertia: prefersReducedMotion ? 0 : Math.min(1, velocityEnergy + pointerEnergy * 0.45),
        interactionState: p,
        reducedMotion: prefersReducedMotion,
      });
    }

    invalidateRef.current();
  });

  return (
    <group
      ref={coreRef}
      position={[0, 0, 0]}
      scale={compactScale * objectScale}
    >
      <mesh castShadow receiveShadow>
        <primitive object={recursiveCoreGeometry} attach="geometry" />
        <shaderMaterial
          ref={slabMatRef}
          vertexShader={slabVert}
          fragmentShader={slabFrag}
          uniforms={slabUniforms}
          side={THREE.FrontSide}
        />
      </mesh>

      {STELA_INSET_PANELS.map((panel, index) => (
        <mesh
          key={`inset-${index}`}
          position={panel.position}
          scale={panel.scale}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={index < 3 ? "#07090c" : "#0b0d10"}
            transparent
            opacity={0.78}
          />
        </mesh>
      ))}

      {STELA_RIDGE_PANELS.map((panel, index) => (
        <mesh
          key={`ridge-${index}`}
          position={panel.position}
          scale={panel.scale}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color={index < 2 ? "#151612" : "#1b1a14"}
            transparent
            opacity={0.70}
          />
        </mesh>
      ))}

      {engravingGeometries.map((geometry, index) => (
        <lineSegments key={`engraving-${index}`} geometry={geometry}>
          <lineBasicMaterial
            color="#c7b98d"
            transparent
            opacity={index < 2 ? 0.34 : 0.24}
          />
        </lineSegments>
      ))}
    </group>
  );
}
