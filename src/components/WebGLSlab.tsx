"use client";

import {
  useRef,
  useMemo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, PerspectiveCamera } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
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

  float grid(vec2 uv, float spacing) {
    vec2 g = abs(fract(uv / spacing - 0.5) / fwidth(uv / spacing));
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    /* ── Deep-space radial gradient mapped to the obsidian palette. */
    vec2  center  = vec2(0.5, 0.4);
    float aspect = 80.0 / 60.0;           /* ellipse rx/ry ratio */
    vec2  toC    = (vUv - center) * vec2(1.0, aspect);
    float ed     = length(toC) / length(vec2(0.5, 0.5 * aspect));
    vec3  deep   = vec3(0.039, 0.047, 0.071); /* #0A0C12 — obsidian deep */
    vec3  mid    = vec3(0.086, 0.106, 0.149); /* #161B26 — obsidian top */
    vec3  col    = mix(mid, deep, clamp(ed * 1.14, 0.0, 1.0));

    /* ── 64px grid with radial mask — neutral white, low opacity */
    float g = grid(vUv, 1.0 / 12.5);
    float mask = 1.0 - smoothstep(0.0, 0.8, length(vUv - vec2(0.5, 0.5)));
    col += vec3(0.50, 0.50, 0.52) * g * mask * 0.020;

    /* ── Atmospheric glow — low-saturation blue-gray edge light */
    vec2  gCenter = vec2(0.5, 0.48);
    vec2  gToC    = (vUv - gCenter) * vec2(1.0, 1.0 / 0.8);
    float gd      = length(gToC) / 0.5;
    float glow    = max(0.0, 1.0 - gd) * 0.065;
    col += vec3(0.20, 0.28, 0.34) * glow;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Slab vertex shader
   ───────────────────────────────────────────────────────────────── */

const slabVert = /* glsl */ `
  uniform float uTime;
  uniform float uInertia;
  uniform float uScrollProgress;
  uniform float uScrollVelocity;
  uniform float uStageIndex;
  uniform float uStageProgress;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vWarp;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(43.13, 137.17))) * 48758.233);
  }

  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);

    vec3 p = position;
    float phase = uStageIndex + uStageProgress;
    float causal = smoothstep(1.0, 1.22, phase) * (1.0 - smoothstep(1.78, 2.0, phase));
    float recursion = smoothstep(2.0, 2.22, phase) * (1.0 - smoothstep(2.78, 3.0, phase));
    float selfRef = smoothstep(3.0, 3.22, phase) * (1.0 - smoothstep(3.78, 4.0, phase));
    float rebuild = smoothstep(4.0, 4.35, phase);
    float topMask = smoothstep(-0.10, 0.62, normal.y);
    vec2 centered = uv - vec2(0.5);
    float drift = sin((uv.y - 0.5) * 8.0 + uTime * 0.42 + phase) * (0.0035 + uInertia * 0.0040);
    float jitter = (hash(uv + vec2(phase, phase + 0.37)) - 0.5) * 0.0012 * (1.0 + uInertia);
    float scrollCurve = (centered.x * centered.x - centered.y * 0.16) * uScrollProgress * 0.035;
    float feedbackWave = sin((uv.x * 2.0 + uv.y * 1.35 + uTime * 0.10) * 6.28318) * 0.014;
    float causalShear = centered.x * 0.018 + centered.y * 0.010;
    float rebuildSettle = (abs(centered.x) + abs(centered.y)) * 0.016;

    vWarp = topMask * (
      scrollCurve +
      causal * causalShear +
      recursion * feedbackWave +
      selfRef * abs(centered.x) * 0.020 -
      rebuild * rebuildSettle
    );

    p += normal * drift;
    p.y += vWarp + abs(uScrollVelocity) * topMask * 0.010;
    p.z += causal * centered.x * 0.030 * topMask;
    p.x += selfRef * centered.y * 0.018 * topMask;
    p.x += jitter;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Slab fragment shader
   ───────────────────────────────────────────────────────────────── */

const slabFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uScrollProgress;
  uniform float uStageIndex;
  uniform float uStageProgress;
  uniform float uScrollVelocity;
  uniform vec2  uMouse;
  uniform float uInertia;
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

  float stageGate(float start, float end, float phase) {
    float soft = 0.22;
    float inGate = smoothstep(start, start + soft, phase);
    float outGate = 1.0 - smoothstep(end - soft, end, phase);
    return inGate * outGate;
  }

  void main() {
    float phase = uStageIndex + uStageProgress;
    float obs = stageGate(0.0, 1.0, phase);
    float causal = stageGate(1.0, 2.0, phase);
    float recursion = stageGate(2.0, 3.0, phase);
    float selfRef = stageGate(3.0, 4.0, phase);
    float rebuild = stageGate(4.0, 5.0, phase);

    vec3 col = vec3(0.58, 0.58, 0.55);
    col += noise(vUv * 40.0) * 0.035;
    col += vec3(0.78, 0.77, 0.72) * clamp(vWarp * 4.4, -0.035, 0.055);

    float g1 = grid(vUv, 0.08) * 0.17;
    float g2 = grid(vUv, 0.02) * 0.055;

    float diag = smoothstep(0.46, 0.50, abs(vUv.x - vUv.y)) * 0.04;
    diag *= step(0.1, vUv.x) * step(vUv.x, 0.9)
          * step(0.1, vUv.y) * step(vUv.y, 0.9);

    col += vec3(0.86, 0.85, 0.80) * max(g1, g2)
         + vec3(0.78, 0.77, 0.72) * diag * 0.55;

    float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.04, edgeDist);
    col -= vec3(0.26, 0.26, 0.24) * edge * 0.34;
    col += vec3(0.96, 0.94, 0.88) * edge * 0.13;

    vec3 lightDir = normalize(vec3(0.2, 1.0, 0.4));
    col += vec3(0.18, 0.18, 0.16)
         * clamp(dot(vNormal, lightDir), 0.0, 1.0) * 0.22;

    float dist  = length(vUv - 0.5);
    float pulse = sin(uTime * 1.8) * 0.5 + 0.5;
    float glow  = clamp(1.0 - dist / 0.35, 0.0, 1.0) * pulse * 0.025;
    col += vec3(0.95, 0.93, 0.86) * glow;

    float sheen = clamp(vUv.y + uMouse.y * 0.1 - 0.4, 0.0, 1.0) * 0.03;
    col += vec3(0.88, 0.86, 0.78) * sheen;
    col += vec3(0.98, 0.96, 0.88) * clamp(abs(uScrollVelocity) * 0.22, 0.0, 0.05);
    col += vec3(0.96, 0.94, 0.84) * (0.06 + uInertia * 0.08) * obs;

    float stageDepth = smoothstep(0.0, 1.0, uScrollProgress);

    float observeSweep = 1.0 - smoothstep(0.004, 0.018, abs(vUv.x - (0.5 + uMouse.x * 0.09 + sin(uTime * 0.35 + vUv.y * 8.0) * 0.008)));
    float observeNode = 1.0 - smoothstep(0.008, 0.020, abs(vUv.y - (0.5 + uMouse.y * 0.05 + cos(uTime * 0.28 + vUv.x * 8.0) * 0.005)));
    col += vec3(0.90, 0.88, 0.82) * (observeSweep * 0.36 + observeNode * 0.18) * (0.4 + 1.4 * uInertia) * obs;

    float traceA = 1.0 - smoothstep(0.004, 0.022, sdSegment(vUv, vec2(0.13, 0.30), vec2(0.88, 0.59)));
    float traceB = 1.0 - smoothstep(0.006, 0.026, sdSegment(vUv, vec2(0.22, 0.70), vec2(0.76, 0.34)));
    float traceC = 1.0 - smoothstep(0.006, 0.030, sdSegment(vUv, vec2(0.18, 0.43), vec2(0.58, 0.48)));
    float chainPulse = 0.70 + sin(uTime * 0.58 + vUv.x * 7.0 + phase) * 0.30;
    float traceNodes =
      (1.0 - smoothstep(0.012, 0.038, length(vUv - vec2(0.13, 0.30)))) +
      (1.0 - smoothstep(0.012, 0.038, length(vUv - vec2(0.88, 0.59)))) +
      (1.0 - smoothstep(0.010, 0.034, length(vUv - vec2(0.58, 0.48))));
    col += vec3(0.92, 0.90, 0.84) * (traceA * 0.135 + traceB * 0.070 + traceC * 0.052) * causal * chainPulse;
    col += vec3(0.98, 0.96, 0.88) * traceNodes * causal * 0.052;

    float feedback = recursion;
    vec2 loopUv = (vUv - vec2(0.5)) * vec2(1.0, 1.55);
    float loopRadius = length(loopUv);
    float loopAngle = atan(loopUv.y, loopUv.x);
    float loopWave = sin(loopAngle * 3.0 + uTime * 0.42) * 0.012;
    float loopLine = 1.0 - smoothstep(0.006, 0.028, abs(loopRadius - (0.285 + loopWave)));
    float innerLoop = 1.0 - smoothstep(0.006, 0.025, abs(loopRadius - (0.185 - loopWave * 0.55)));
    float loopGap = smoothstep(-0.30, 0.56, sin(loopAngle + uTime * 0.30));
    float loopHead = exp(-abs(sin(loopAngle - uTime * 0.38)) * 10.0);
    float loopRing = 1.0 - smoothstep(0.006, 0.026, abs(loopRadius - (0.255 + loopWave * 0.42)));
    col += vec3(0.92, 0.90, 0.84) * loopLine * loopGap * feedback * 0.135;
    col += vec3(0.78, 0.77, 0.72) * innerLoop * (1.0 - loopGap * 0.55) * feedback * 0.070;
    col += vec3(1.00, 0.98, 0.90) * loopHead * loopLine * feedback * 0.048;
    col += vec3(0.96, 0.95, 0.89) * loopRing * feedback * 0.035;

    float mirrorLine = 1.0 - smoothstep(0.002, 0.014, abs(vUv.x - 0.5));
    float mirrorEcho = 1.0 - smoothstep(0.012, 0.060, abs(vUv.x - (1.0 - vUv.y * 0.18 - 0.41)));
    float lens = exp(-length((vUv - vec2(0.5, 0.52)) * vec2(1.4, 0.85)) * 3.2);
    vec2 mirrorTrace = vec2(1.0 - vUv.y, vUv.x);
    float feedbackBand = 1.0 - smoothstep(0.008, 0.020, length(vUv - mirrorTrace));
    col += vec3(0.98, 0.96, 0.88) * mirrorLine * selfRef * 0.064;
    col += vec3(0.78, 0.77, 0.72) * mirrorEcho * lens * selfRef * 0.082;
    col += vec3(0.96, 0.94, 0.88) * feedbackBand * selfRef * 0.030;
    col -= vec3(0.12, 0.12, 0.11) * selfRef * lens * 0.040;

    float settle = smoothstep(0.0, 1.0, uStageProgress);
    vec2 n1 = mix(vec2(0.21, 0.31), vec2(0.25, 0.25), settle);
    vec2 n2 = mix(vec2(0.39, 0.66), vec2(0.36, 0.58), settle);
    vec2 n3 = mix(vec2(0.61, 0.39), vec2(0.64, 0.46), settle);
    vec2 n4 = mix(vec2(0.80, 0.72), vec2(0.77, 0.67), settle);
    vec2 n5 = mix(vec2(0.50, 0.28), vec2(0.52, 0.33), settle);
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
    col += vec3(0.88, 0.87, 0.80) * network * rebuild * 0.080;
    col += vec3(1.00, 0.97, 0.88) * nodes * rebuild * 0.105;
    col += vec3(0.94, 0.90, 0.85) * grid(vUv + vec2(0.012, -0.008) * phase, 0.13) * rebuild * 0.020;
    col += vec3(0.98, 0.94, 0.86) * settle * 0.032 * grid(vUv, 0.28) * rebuild;
    col *= 1.0 + stageDepth * 0.035;
    col = clamp(col, vec3(0.0), vec3(1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Physics constants
   ───────────────────────────────────────────────────────────────── */

export const PHYS = {
  spring:  0.045,
  damping: 0.82,
  gravity: 0.004,
  settle:  0.007,
} as const;

export const REST_TILT_Y = 0.18;

const STAGE_POSES = [
  { x: 0.00, y: -0.02, z: 0.00, scale: 1.00, yaw: 0.00, roll: 0.00, pitch: 0.00 },
  { x: -0.38, y: 0.02, z: 0.08, scale: 0.88, yaw: -0.18, roll: -0.030, pitch: -0.04 },
  { x: 0.28, y: 0.08, z: -0.16, scale: 1.16, yaw: 0.22, roll: 0.045, pitch: 0.16 },
  { x: 0.00, y: 0.15, z: 0.18, scale: 0.92, yaw: 0.00, roll: 0.000, pitch: -0.08 },
  { x: -0.16, y: 0.06, z: -0.08, scale: 1.10, yaw: -0.08, roll: -0.016, pitch: 0.06 },
] as const;

function smoothstep01(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getStagePose(stageIndex: number, stageProgress: number) {
  const current = STAGE_POSES[Math.max(0, Math.min(STAGE_POSES.length - 1, Math.floor(stageIndex)))] ?? STAGE_POSES[0];
  const next = STAGE_POSES[Math.max(0, Math.min(STAGE_POSES.length - 1, Math.floor(stageIndex) + 1))] ?? current;
  const t = smoothstep01(stageProgress);

  return {
    x: THREE.MathUtils.lerp(current.x, next.x, t),
    y: THREE.MathUtils.lerp(current.y, next.y, t),
    z: THREE.MathUtils.lerp(current.z, next.z, t),
    scale: THREE.MathUtils.lerp(current.scale, next.scale, t),
    yaw: THREE.MathUtils.lerp(current.yaw, next.yaw, t),
    roll: THREE.MathUtils.lerp(current.roll, next.roll, t),
    pitch: THREE.MathUtils.lerp(current.pitch, next.pitch, t),
  };
}

/* ─────────────────────────────────────────────────────────────────
   Physics state shape
   ───────────────────────────────────────────────────────────────── */

export interface PhysicsState {
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
  uScrollProgress: { value: number };
  uStageIndex: { value: number };
  uStageProgress: { value: number };
  uScrollVelocity: { value: number };
  uMouse: { value: THREE.Vector2 };
  uInertia: { value: number };
}

interface SlabMeshProps {
  slabUniforms: SlabUniforms;
  physRef: React.MutableRefObject<PhysicsState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
  invalidateRef: React.MutableRefObject<() => void>;
  prefersReducedMotion: boolean;
}

function SlabMesh({
  slabUniforms,
  physRef,
  sceneStateRef,
  invalidateRef,
  prefersReducedMotion,
}: SlabMeshProps) {
  const slabRef    = useRef<THREE.Mesh>(null);
  const slabMatRef = useRef<THREE.ShaderMaterial>(null);
  const slabBodyRef = useRef<any>(null);
  const { viewport } = useThree();
  const slabScale = Math.min(0.58, Math.max(0.38, (viewport.width / 4.2) * 0.62));
  const isCompact = viewport.width < 4;
  const slabY = isCompact ? -1.02 : -1.18;

  useFrame(({ clock }) => {
    const p = physRef.current;
    const t = p.active ? PHYS.spring : PHYS.settle;
    const d = p.active ? PHYS.damping : 0.88;

    const dx = p.target.x - p.pos.x;
    const dy = p.target.y - p.pos.y;
    p.vel.x = p.vel.x * d + dx * t;
    p.vel.y = p.vel.y * d + dy * t;

    if (!p.active) p.vel.y += PHYS.gravity;

    const speed = Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2);
    const maxV = 0.12;
    if (speed > maxV) {
      const inv = maxV / speed;
      p.vel.x *= inv;
      p.vel.y *= inv;
    }
    const inertia = Math.min(1, speed / maxV);

    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.pos.y = Math.max(-0.55, Math.min(0.88, p.pos.y));

    const scene = sceneStateRef.current;
    const stage = scene.stageIndex;
    const stageProgress = scene.stageProgress;

    const body = slabBodyRef.current;
    const pose = getStagePose(stage, stageProgress);
    const compactScale = isCompact ? 0.92 : 1;
    const velocity = THREE.MathUtils.clamp(scene.scrollVelocity, -1.35, 1.35);
    const velocityAbs = Math.abs(velocity);

    if (body) {
      const target = {
        x: (pose.x + velocity * 0.045) * compactScale,
        y: slabY + pose.y + velocityAbs * 0.018,
        z: pose.z - velocityAbs * 0.055,
      };

      const translation = body.translation ? body.translation() : { x: target.x, y: target.y, z: target.z };
      const impulse = {
        x: (target.x - (translation?.x ?? target.x)) * 0.35,
        y: (target.y - (translation?.y ?? target.y)) * 0.35,
        z: (target.z - (translation?.z ?? target.z)) * 0.35,
      };

      if (body.applyImpulse) {
        body.applyImpulse(impulse, true);
      }

      const linvel = body.linvel ? body.linvel() : { x: 0, y: 0, z: 0 };
      if (body.setLinvel) {
        const maxV = 0.24;
        body.setLinvel(
          {
            x: clamp(linvel.x, -maxV, maxV),
            y: clamp(linvel.y, -maxV, maxV),
            z: clamp(linvel.z, -maxV, maxV),
          },
          true
        );
      }

      if (slabRef.current && translation) {
        slabRef.current.position.set(translation.x, translation.y, translation.z);
      }
    } else if (slabRef.current) {
      slabRef.current.position.set(0, slabY, 0);
    }

    if (slabRef.current) {
      const velocityAbs = Math.abs(velocity);

      slabRef.current.position.x = (pose.x + velocity * 0.045) * compactScale;
      slabRef.current.position.y = slabY + pose.y + velocityAbs * 0.018;
      slabRef.current.position.z = pose.z - velocityAbs * 0.055;
      slabRef.current.rotation.x = p.pos.y + pose.pitch + velocity * 0.105;
      slabRef.current.rotation.y = p.pos.x + pose.yaw - velocity * 0.055;
      slabRef.current.rotation.z = pose.roll + velocity * 0.026;
      slabRef.current.scale.setScalar(
        slabScale * pose.scale * compactScale * (1 + velocityAbs * 0.028)
      );
    }
    if (slabMatRef.current) {
      slabMatRef.current.uniforms.uMouse.value.set(p.pos.x * 1.6, p.pos.y * 1.6);
      slabMatRef.current.uniforms.uInertia.value = prefersReducedMotion ? 0 : inertia;
    }
    /* uTime is always updated so the slab shader keeps animating */
    if (slabMatRef.current) {
      slabMatRef.current.uniforms.uTime.value = prefersReducedMotion
        ? 0
        : clock.getElapsedTime();
      slabMatRef.current.uniforms.uScrollProgress.value = scene.scrollProgress;
      slabMatRef.current.uniforms.uStageIndex.value = stage;
      slabMatRef.current.uniforms.uStageProgress.value = stageProgress;
      slabMatRef.current.uniforms.uScrollVelocity.value = scene.scrollVelocity;
    }

    invalidateRef.current();
  });

  return (
    <RigidBody
      ref={slabBodyRef}
      type="dynamic"
      position={[0, slabY, 0]}
      mass={1.2}
      colliders={false}
      linearDamping={4}
      angularDamping={8}
      restitution={0.22}
      friction={0.8}
      canSleep={false}
    >
      <CuboidCollider args={[slabScale * 2.02, 0.02, slabScale * 1.35]} />
      <mesh
        ref={slabRef}
        position={[0, slabY, 0]}
        rotation={[REST_TILT_Y, 0, 0]}
        scale={slabScale}
      >
        <boxGeometry args={[4.2, 0.035, 2.6, 32, 1, 18]} />
        <shaderMaterial
          ref={slabMatRef}
          vertexShader={slabVert}
          fragmentShader={slabFrag}
          uniforms={slabUniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
    </RigidBody>
  );
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
  physRef: React.MutableRefObject<PhysicsState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
}

export default function WebGLSlab({ physRef, sceneStateRef }: WebGLSlabProps) {
  const invalidateRef = useRef<() => void>(() => {});

  const slabUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScrollProgress: { value: 0 },
      uStageIndex: { value: 0 },
      uStageProgress: { value: 0 },
      uScrollVelocity: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uInertia: { value: 0 },
    }),
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
        <PerspectiveCamera makeDefault position={[0, 2.0, 5.2]} fov={42} near={0.1} far={100} />
        <ambientLight intensity={0.4} color="#1a2030" />
        <directionalLight position={[3, 6, 4]} intensity={0.6} color="#c8d8f0" />
        <pointLight position={[0, -2, 2]} intensity={0.08} color="#2040a0" />

        {/* NDC fullscreen background quad — fixed, no perspective */}
        <BgQuad />

        <Physics
          gravity={[0, -30, 0]}
          timeStep={1 / 60}
          paused={false}
        >
          <RigidBody
            type="fixed"
            position={[0, -0.9, 0]}
            colliders={false}
            restitution={0.1}
            friction={1.2}
          >
            <CuboidCollider args={[8.8, 0.22, 4]} />
          </RigidBody>

          <RigidBody
            type="fixed"
            position={[-2.35, 0, 0]}
            colliders={false}
            restitution={0.15}
            friction={1.2}
          >
            <CuboidCollider args={[0.06, 2, 4]} />
          </RigidBody>

          <RigidBody
            type="fixed"
            position={[2.35, 0, 0]}
            colliders={false}
            restitution={0.15}
            friction={1.2}
          >
            <CuboidCollider args={[0.06, 2, 4]} />
          </RigidBody>

          <Float
            speed={0.9}
            rotationIntensity={0.0}
            floatIntensity={0}
          >
            <SlabMesh
              slabUniforms={slabUniforms}
              physRef={physRef}
              sceneStateRef={sceneStateRef}
              invalidateRef={invalidateRef}
              prefersReducedMotion={prefersReducedMotion.current}
            />
          </Float>
        </Physics>
      </Canvas>
    </div>
  );
}
