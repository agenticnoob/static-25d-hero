"use client";

import {
  useRef,
  useMemo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider, BallCollider } from "@react-three/rapier";
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
    float pulse = 0.5;
    float glow  = clamp(1.0 - dist / 0.35, 0.0, 1.0) * pulse * 0.025;
    col += vec3(0.95, 0.93, 0.86) * glow;

    float observeSweep = 1.0 - smoothstep(0.004, 0.018, abs(vUv.x - (0.5 + uMouse.x * 0.09 + sin(uTime * 0.35 + vUv.y * 8.0) * 0.008)));
    float observeNode = 1.0 - smoothstep(0.008, 0.020, abs(vUv.y - (0.5 + uMouse.y * 0.05 + cos(uTime * 0.28 + vUv.x * 8.0) * 0.005)));
    col += vec3(0.90, 0.88, 0.82) * (observeSweep * 0.36 + observeNode * 0.18) * (0.4 + 1.4 * uInertia) * 0.03;

    float impactRim = 1.0 - smoothstep(0.0, 0.34, length(vUv - vec2(0.5, 0.5)));
    float impactGlint = pow(max(vNormal.y, 0.0), 2.0) * impactRim * uImpact;
    float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.0);
    col += vec3(1.0, 0.98, 0.92) * impactGlint * 0.42;
    col -= vec3(0.05, 0.05, 0.04) * (1.0 - fresnel) * (0.4 + uImpact * 0.7);
    col += vec3(0.96, 0.94, 0.85) * clamp(abs(uImpact), 0.0, 1.0) * (0.8 - fresnel) * 0.12;

    float traceA = 1.0 - smoothstep(0.004, 0.022, sdSegment(vUv, vec2(0.13, 0.30), vec2(0.88, 0.59)));
    float traceB = 1.0 - smoothstep(0.006, 0.026, sdSegment(vUv, vec2(0.22, 0.70), vec2(0.76, 0.34)));
    float traceC = 1.0 - smoothstep(0.006, 0.030, sdSegment(vUv, vec2(0.18, 0.43), vec2(0.58, 0.48)));
    float chainPulse = 0.70 + sin(uTime * 0.58 + vUv.x * 7.0) * 0.30;
    float traceNodes =
      (1.0 - smoothstep(0.012, 0.038, length(vUv - vec2(0.13, 0.30)))) +
      (1.0 - smoothstep(0.012, 0.038, length(vUv - vec2(0.88, 0.59)))) +
      (1.0 - smoothstep(0.010, 0.034, length(vUv - vec2(0.58, 0.48))));
    col += vec3(0.92, 0.90, 0.84) * (traceA * 0.135 + traceB * 0.070 + traceC * 0.052) * chainPulse;
    col += vec3(0.98, 0.96, 0.88) * traceNodes * 0.052;

    float feedback = 1.0;
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
    col += vec3(0.98, 0.96, 0.88) * mirrorLine * 0.064;
    col += vec3(0.78, 0.77, 0.72) * mirrorEcho * lens * 0.082;
    col += vec3(0.96, 0.94, 0.88) * feedbackBand * 0.030;
    col -= vec3(0.12, 0.12, 0.11) * lens * 0.040;

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
    col += vec3(0.88, 0.87, 0.80) * network * 0.080;
    col += vec3(1.00, 0.97, 0.88) * nodes * 0.105;
    col += vec3(0.94, 0.90, 0.85) * grid(vUv + vec2(0.012, -0.008), 0.13) * 0.020;
    col = clamp(col, vec3(0.0), vec3(1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Physics constants
   ───────────────────────────────────────────────────────────────── */

const ROT_DAMPING_IDLE = 0.88;
const ROT_MAX_VEL = 0.12;
const ROOM_HALF_DESKTOP = 2.8;
const ROOM_HALF_COMPACT = 2.05;
const WORLD_GRAVITY = -1.62;
const REAL_GROUND_IMPACT_RESTITUTION = 0.52;
const REAL_WALL_RESTITUTION = 0.32;
const REAL_WALL_FRICTION = 0.65;
const REAL_BODY_RESTITUTION = 0.68;
const REAL_BODY_FRICTION = 0.44;
const REAL_BODY_MASS = 1.5;
const REAL_BODY_LINEAR_DAMPING = 0.03;
const REAL_BODY_ANGULAR_DAMPING = 0.11;

export const REST_TILT_Y = 0.18;

interface RoomConstraintConfig {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

type Vec3Like = { x: number; y: number; z: number };

interface RigidBodyApi {
  linvel: () => Vec3Like;
  setLinvel: (velocity: Vec3Like, wake?: boolean) => void;
  setAngvel: (velocity: Vec3Like, wake?: boolean) => void;
  setNextKinematicTranslation?: (translation: Vec3Like) => void;
  setTranslation?: (translation: Vec3Like, wake?: boolean) => void;
}

interface RoomWallConfig {
  key: string;
  position: [number, number, number];
  colliderHalfExtents: [number, number, number];
}

const WORLD_SETTINGS = {
  gravity: [0, WORLD_GRAVITY, 0] as const,
  timeStep: 1 / 120,
};

const CAMERA_SETTINGS = {
  compact: [0.98, 1.04, 0.98] as [number, number, number],
  desktop: [1.72, 1.58, 1.72] as [number, number, number],
  fov: 62,
  near: 0.1,
  far: 60,
};

const WALL_GEOMETRY = {
  thickness: 0.18,
  edgePadding: 0.12,
  cornerPadding: 0.16,
};

const COLLISION_SETTINGS = {
  wallRestitution: REAL_WALL_RESTITUTION,
  wallFriction: REAL_WALL_FRICTION,
  bodyMass: REAL_BODY_MASS,
  bodyLinearDamping: REAL_BODY_LINEAR_DAMPING,
  bodyAngularDamping: REAL_BODY_ANGULAR_DAMPING,
  bodyRestitution: REAL_BODY_RESTITUTION,
  bodyFriction: REAL_BODY_FRICTION,
  restitutionBoost: REAL_GROUND_IMPACT_RESTITUTION,
};

const ROTATION_SETTINGS = {
  dampingIdle: ROT_DAMPING_IDLE,
  maxVelocity: ROT_MAX_VEL,
};

const IMPACT_SETTINGS = {
  energyScale: 0.12,
  minPulse: 0.16,
  impulseScale: 0.34,
  angularBase: 0.5,
  angularSpan: 1.4,
  angularYScale: 1.02,
  floorBounceBoost: 0.34,
  decay: 0.94,
  decayLoss: 0.005,
  velocityDamping: 0.985,
};

const ROOM_OBJECT_SETTINGS = {
  slabRestY: 1.1,
  slabGeometryScaleBaseFactor: 0.76,
  slabCompactScale: 0.92,
  objectScaleMax: 0.5,
  objectScaleMin: 0.22,
  viewportScaleMin: 0.38,
  viewportScaleMax: 0.58,
  viewportScaleDivisor: 4.2,
  viewportScaleMul: 0.62,
};

const ROOM_VISUALS = {
  outerEdgeColor: "#455261",
  outerEdgeOpacity: 0.26,
  shellColor: "#121920",
  shellOpacity: 0.24,
  floorColor: "#0f141a",
  floorOpacity: 0.35,
};

const ROOM_SCROLL_DRIFT = {
  travelY: 2.12,
  travelZ: 0,
  velocityY: 0.42,
  velocityZ: 0,
  velocityX: 0,
  smoothing: 0.12,
};

const CUBE_GEOMETRY_SIZE = 1.9;

class SlabViewportProfile {
  constructor(private readonly width: number) {}

  get isCompact(): boolean {
    return this.width < 4;
  }

  get roomHalf(): number {
    return this.isCompact ? ROOM_HALF_COMPACT : ROOM_HALF_DESKTOP;
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

class RoomSpace {
  constructor(private readonly halfSize: number) {}

  get half(): number {
    return this.halfSize;
  }

  get bounds(): RoomConstraintConfig {
    return {
      minX: -this.half,
      maxX: this.half,
      minY: -this.half,
      maxY: this.half,
      minZ: -this.half,
      maxZ: this.half,
    };
  }

  get center() {
    const b = this.bounds;
    return {
      x: (b.minX + b.maxX) / 2,
      y: (b.minY + b.maxY) / 2,
      z: (b.minZ + b.maxZ) / 2,
    };
  }

  get width(): number {
    return this.half * 2;
  }

  get height(): number {
    return this.half * 2;
  }

  get depth(): number {
    return this.half * 2;
  }

  get walls(): RoomWallConfig[] {
    const { minX, maxX, minY, maxY, minZ, maxZ } = this.bounds;
    const { x, y, z } = this.center;
    const wall = WALL_GEOMETRY.thickness;

    return [
      {
        key: "wall-bottom",
        position: [x, minY - wall, z],
        colliderHalfExtents: [this.half + wall, wall, this.half + wall],
      },
      {
        key: "wall-top",
        position: [x, maxY + wall, z],
        colliderHalfExtents: [this.half + wall, wall, this.half + wall],
      },
      {
        key: "wall-left",
        position: [minX - wall, y, z],
        colliderHalfExtents: [wall, this.half + wall, this.half + wall],
      },
      {
        key: "wall-right",
        position: [maxX + wall, y, z],
        colliderHalfExtents: [wall, this.half + wall, this.half + wall],
      },
      {
        key: "wall-back",
        position: [x, y, minZ - wall],
        colliderHalfExtents: [this.half + wall, this.half + wall, wall],
      },
      {
        key: "wall-front",
        position: [x, y, maxZ + wall],
        colliderHalfExtents: [this.half + wall, this.half + wall, wall],
      },
    ];
  }
}

class SlabColliderProfile {
  constructor(
    private readonly objectScale: number,
    private readonly compactScale: number
  ) {}

  get colliderRadius(): number {
    const scale = this.objectScale * this.compactScale;
    return Math.max(0.06, (CUBE_GEOMETRY_SIZE * scale) / 2);
  }
}

class SlabMotionController {
  constructor(
    private readonly damping: number,
    private readonly maxSpeed: number
  ) {}

  tick(state: PhysicsState): number {
    state.vel.x *= this.damping;
    state.vel.y *= this.damping;

    const speed = Math.sqrt(state.vel.x ** 2 + state.vel.y ** 2);

    if (speed > this.maxSpeed) {
      const inv = this.maxSpeed / speed;
      state.vel.x *= inv;
      state.vel.y *= inv;
    }

    state.pos.x += state.vel.x;
    state.pos.y += state.vel.y;
    state.pos.y = Math.max(-0.55, Math.min(0.88, state.pos.y));

    return Math.min(1, speed / this.maxSpeed);
  }
}

class SlabImpactResolver {
  constructor(
    private readonly groundRestitution: number,
    private readonly impulseEnergyScale = IMPACT_SETTINGS.energyScale,
    private readonly minPulse = IMPACT_SETTINGS.minPulse,
    private readonly impulseScale = IMPACT_SETTINGS.impulseScale,
    private readonly angularBase = IMPACT_SETTINGS.angularBase,
    private readonly angularSpan = IMPACT_SETTINGS.angularSpan,
    private readonly angularYScale = IMPACT_SETTINGS.angularYScale,
    private readonly floorBounceBoost = IMPACT_SETTINGS.floorBounceBoost,
    private readonly velocityDamping = IMPACT_SETTINGS.velocityDamping,
  ) {}

  apply(body: RigidBodyApi): number {
    const currentVel = body.linvel();
    const speed = Math.sqrt(
      currentVel.x ** 2 + currentVel.y ** 2 + currentVel.z ** 2
    );
    const impactScale = Math.min(1, Math.max(this.minPulse, speed * this.impulseEnergyScale));
    const spinScale = this.angularBase + impactScale * this.angularSpan;
    const randomX = () => (Math.random() - 0.5) * this.impulseScale * impactScale;
    const randomZ = () => (Math.random() - 0.5) * this.impulseScale * impactScale;

    body.setLinvel(
      {
        x: currentVel.x * this.velocityDamping + randomX(),
        y: currentVel.y * this.velocityDamping + Math.max(0, -currentVel.y) * this.groundRestitution * this.floorBounceBoost,
        z: currentVel.z * this.velocityDamping + randomZ(),
      },
      true
    );

    body.setAngvel(
      {
        x: (Math.random() - 0.5) * spinScale,
        y: (Math.random() - 0.5) * this.angularYScale * spinScale,
        z: (Math.random() - 0.5) * spinScale,
      },
      true
    );

    return impactScale;
  }
}

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
    physicsPos: PhysicsState;
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
    options.physicsPos.x * 1.6,
    options.physicsPos.y * 1.6
  );
  uInertia.value = options.reducedMotion ? 0 : options.inertia;
  uImpact.value = options.impact;
  uTime.value = options.reducedMotion
    ? 0
    : options.clock.getElapsedTime();
}

function RoomDebug({
  room,
  offset,
}: {
  room: RoomSpace;
  offset: React.MutableRefObject<THREE.Vector3>;
}) {
  const roomDebugRef = useRef<THREE.Group>(null);
  const width = room.width;
  const height = room.height;
  const depth = room.depth;

  useFrame(() => {
    const origin = offset.current;
    if (!roomDebugRef.current) return;
    roomDebugRef.current.position.set(origin.x, origin.y, origin.z);
  });

  const outerGeom = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth)),
    [width, height, depth]
  );
  const innerGeom = useMemo(
    () =>
      new THREE.BoxGeometry(
        Math.max(width - WALL_GEOMETRY.edgePadding, 0.01),
        Math.max(height - WALL_GEOMETRY.cornerPadding, 0.01),
        Math.max(depth - WALL_GEOMETRY.edgePadding, 0.01)
      ),
    [width, height, depth]
  );

  return (
    <group ref={roomDebugRef}>
      <lineSegments>
        <primitive object={outerGeom} attach="geometry" />
        <lineBasicMaterial
          color={ROOM_VISUALS.outerEdgeColor}
          transparent
          opacity={ROOM_VISUALS.outerEdgeOpacity}
          depthWrite={false}
          linewidth={1}
        />
        </lineSegments>
      <mesh
        position={[0, -height / 2 + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[Math.max(width - WALL_GEOMETRY.edgePadding, 0.01), Math.max(depth - WALL_GEOMETRY.edgePadding, 0.01)]} />
        <meshBasicMaterial
          color={ROOM_VISUALS.floorColor}
          transparent
          opacity={ROOM_VISUALS.floorOpacity}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <primitive object={innerGeom} attach="geometry" />
        <meshBasicMaterial
          color={ROOM_VISUALS.shellColor}
          transparent
          opacity={ROOM_VISUALS.shellOpacity}
          toneMapped={false}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function RoomCollisionVolume({
  room,
  restitution,
  friction,
  offset,
}: {
  room: RoomSpace;
  restitution: number;
  friction: number;
  offset: React.MutableRefObject<THREE.Vector3>;
}) {
  const wallBodiesRef = useRef<Record<string, RigidBodyApi | null>>({});

  useFrame(() => {
    const roomOffset = offset.current;
    room.walls.forEach((wall) => {
      const body = wallBodiesRef.current[wall.key];
      if (!body) return;

      const position = {
        x: wall.position[0] + roomOffset.x,
        y: wall.position[1] + roomOffset.y,
        z: wall.position[2] + roomOffset.z,
      };

      if (typeof body.setNextKinematicTranslation === "function") {
        body.setNextKinematicTranslation(position);
        return;
      }

      if (typeof body.setTranslation === "function") {
        body.setTranslation(position, true);
      }
    });
  });

  return (
    <group>
      {room.walls.map((wall) => (
        <RigidBody
          key={wall.key}
          type="kinematicPosition"
          ref={(body: RigidBodyApi | null) => {
            wallBodiesRef.current[wall.key] = body;
          }}
          position={[
            wall.position[0] + offset.current.x,
            wall.position[1] + offset.current.y,
            wall.position[2] + offset.current.z,
          ]}
          colliders={false}
          restitution={restitution}
          friction={friction}
        >
          <CuboidCollider args={wall.colliderHalfExtents} />
        </RigidBody>
      ))}
    </group>
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
        <fog color="#0A0C12" near={1.95} far={20.2} />

        {/* NDC fullscreen background quad — fixed, no perspective */}
        <BgQuad />

        <Physics
          gravity={WORLD_SETTINGS.gravity}
          timeStep={WORLD_SETTINGS.timeStep}
          paused={false}
        >
          <SlabMesh
            slabUniforms={slabUniforms}
            physRef={physRef}
            sceneStateRef={sceneStateRef}
            invalidateRef={invalidateRef}
            prefersReducedMotion={prefersReducedMotion.current}
            cameraBasePosition={cameraPos}
          />
        </Physics>
      </Canvas>
    </div>
  );
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
  uMouse: { value: THREE.Vector2 };
  uInertia: { value: number };
  uImpact: { value: number };
}

interface SlabMeshProps {
  slabUniforms: SlabUniforms;
  physRef: React.MutableRefObject<PhysicsState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
  invalidateRef: React.MutableRefObject<() => void>;
  prefersReducedMotion: boolean;
  cameraBasePosition: [number, number, number];
}

function SlabMesh({
  slabUniforms,
  physRef,
  sceneStateRef,
  invalidateRef,
  prefersReducedMotion,
  cameraBasePosition,
}: SlabMeshProps) {
  const slabMatRef = useRef<THREE.ShaderMaterial>(null);
  const slabBodyRef = useRef<any>(null);
  const impactRef = useRef(0);
  const roomSpaceRef = useRef(new RoomSpace(ROOM_HALF_DESKTOP));
  const motionControllerRef = useRef(new SlabMotionController(ROTATION_SETTINGS.dampingIdle, ROTATION_SETTINGS.maxVelocity));
  const impactResolverRef = useRef(
    new SlabImpactResolver(COLLISION_SETTINGS.restitutionBoost)
  );
  const roomOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const roomOffsetTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const { viewport, camera } = useThree();
  const viewportProfile = useMemo(
    () => new SlabViewportProfile(viewport.width),
    [viewport.width]
  );
  const objectScale = viewportProfile.objectScale;
  const compactScale = viewportProfile.compactScale;
  const colliderProfile = useMemo(
    () => new SlabColliderProfile(viewportProfile.objectScale, compactScale),
    [viewportProfile.objectScale, compactScale]
  );

  roomSpaceRef.current = new RoomSpace(viewportProfile.roomHalf);

  useFrame(({ clock }) => {
    const p = physRef.current;
    const inertia = motionControllerRef.current.tick(p);
    const sceneState = sceneStateRef.current;
    const scrollProgress = sceneState.scrollProgress;
    const scrollVelocity = sceneState.scrollVelocity;

    roomOffsetTargetRef.current.set(
      scrollVelocity * ROOM_SCROLL_DRIFT.velocityX,
      -scrollProgress * ROOM_SCROLL_DRIFT.travelY + scrollVelocity * ROOM_SCROLL_DRIFT.velocityY,
      -scrollProgress * ROOM_SCROLL_DRIFT.travelZ + scrollVelocity * ROOM_SCROLL_DRIFT.velocityZ
    );
    roomOffsetRef.current.lerp(roomOffsetTargetRef.current, ROOM_SCROLL_DRIFT.smoothing);

    const [baseX, baseY, baseZ] = cameraBasePosition;
    camera.position.set(
      baseX + roomOffsetRef.current.x,
      baseY + roomOffsetRef.current.y,
      baseZ + roomOffsetRef.current.z
    );
    camera.lookAt(roomOffsetRef.current.x, roomOffsetRef.current.y, roomOffsetRef.current.z);

    const activeUniforms = slabMatRef.current?.uniforms ?? slabUniforms;
    if (activeUniforms) {
      applySlabUniforms(activeUniforms as SlabUniforms, {
        clock,
        impact: impactRef.current,
        inertia,
        physicsPos: p,
        reducedMotion: prefersReducedMotion,
      });
    }
    impactRef.current = Math.max(0, impactRef.current * IMPACT_SETTINGS.decay - IMPACT_SETTINGS.decayLoss);

    invalidateRef.current();
  });

  return (
    <>
      <RoomDebug
        room={roomSpaceRef.current}
        offset={roomOffsetRef}
      />
      <RoomCollisionVolume
        room={roomSpaceRef.current}
        restitution={COLLISION_SETTINGS.wallRestitution}
        friction={COLLISION_SETTINGS.wallFriction}
        offset={roomOffsetRef}
      />

      <RigidBody
        ref={slabBodyRef}
        type="dynamic"
        position={[0, ROOM_OBJECT_SETTINGS.slabRestY, 0]}
        rotation={[REST_TILT_Y, 0, 0]}
        mass={COLLISION_SETTINGS.bodyMass}
        colliders={false}
        linearDamping={COLLISION_SETTINGS.bodyLinearDamping}
        angularDamping={COLLISION_SETTINGS.bodyAngularDamping}
        restitution={COLLISION_SETTINGS.bodyRestitution}
        friction={COLLISION_SETTINGS.bodyFriction}
        onCollisionEnter={() => {
          if (!slabBodyRef.current || !slabBodyRef.current.linvel) {
            return;
          }

          impactRef.current = impactResolverRef.current.apply(slabBodyRef.current);
        }}
        canSleep={false}
      >
        <BallCollider args={[colliderProfile.colliderRadius]} />
        <mesh
          castShadow
          position={[0, 0, 0]}
          scale={compactScale * objectScale}
        >
          <sphereGeometry args={[CUBE_GEOMETRY_SIZE / 2, 42, 32]} />
          <shaderMaterial
            ref={slabMatRef}
            vertexShader={slabVert}
            fragmentShader={slabFrag}
            uniforms={slabUniforms}
            side={THREE.DoubleSide}
          />
        </mesh>
      </RigidBody>
    </>
  );
}
