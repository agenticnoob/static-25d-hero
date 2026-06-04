"use client";

import {
  useRef,
  useMemo,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
    /* ── Deep-space radial gradient (CSS: radial-gradient ellipse 80% 60% at 50% 40%)
       Dark gray, neutral, no blue cast. */
    vec2  center  = vec2(0.5, 0.4);
    float aspect = 80.0 / 60.0;           /* ellipse rx/ry ratio */
    vec2  toC    = (vUv - center) * vec2(1.0, aspect);
    float ed     = length(toC) / length(vec2(0.5, 0.5 * aspect));
    vec3  deep   = vec3(0.082, 0.082, 0.088); /* #151516 — darkest */
    vec3  mid    = vec3(0.145, 0.145, 0.154); /* #252527 — mid dark gray */
    vec3  col    = mix(mid, deep, clamp(ed * 1.14, 0.0, 1.0));

    /* ── 64px grid with radial mask — neutral white, low opacity */
    float g = grid(vUv, 1.0 / 12.5);
    float mask = 1.0 - smoothstep(0.0, 0.8, length(vUv - vec2(0.5, 0.5)));
    col += vec3(0.50, 0.50, 0.52) * g * mask * 0.020;

    /* ── Atmospheric glow — neutral gray, very subtle (was blue) */
    vec2  gCenter = vec2(0.5, 0.48);
    vec2  gToC    = (vUv - gCenter) * vec2(1.0, 1.0 / 0.8);
    float gd      = length(gToC) / 0.5;
    float glow    = max(0.0, 1.0 - gd) * 0.065;
    col += vec3(0.24, 0.24, 0.26) * glow;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Slab vertex shader
   ───────────────────────────────────────────────────────────────── */

const slabVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
  uniform vec2  uMouse;
  varying vec2 vUv;
  varying vec3 vNormal;

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
    vec3 col = vec3(0.056, 0.068, 0.090);
    col += noise(vUv * 40.0) * 0.015;

    float g1 = grid(vUv, 0.08) * 0.12;
    float g2 = grid(vUv, 0.02) * 0.045;

    float diag = smoothstep(0.46, 0.50, abs(vUv.x - vUv.y)) * 0.04;
    diag *= step(0.1, vUv.x) * step(vUv.x, 0.9)
          * step(0.1, vUv.y) * step(vUv.y, 0.9);

    col += vec3(0.35, 0.50, 0.68) * max(g1, g2)
         + vec3(0.35, 0.50, 0.68) * diag * 0.5;

    float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edge = 1.0 - smoothstep(0.0, 0.04, edgeDist);
    col += vec3(0.08, 0.14, 0.22) * edge * 0.5;

    vec3 lightDir = normalize(vec3(0.2, 1.0, 0.4));
    col += vec3(0.03, 0.06, 0.10)
         * clamp(dot(vNormal, lightDir), 0.0, 1.0) * 0.3;

    float dist  = length(vUv - 0.5);
    float pulse = sin(uTime * 1.8) * 0.5 + 0.5;
    float glow  = clamp(1.0 - dist / 0.35, 0.0, 1.0) * pulse * 0.025;
    col += vec3(0.25, 0.45, 0.75) * glow;

    float sheen = clamp(vUv.y + uMouse.y * 0.1 - 0.4, 0.0, 1.0) * 0.03;
    col += vec3(0.10, 0.18, 0.28) * sheen;

    float stageDepth = smoothstep(0.0, 1.0, uScrollProgress);
    float phase = uStageIndex + uStageProgress;
    float causalTrace = smoothstep(0.75, 1.25, phase)
                      * (1.0 - smoothstep(2.05, 2.65, phase));
    float traceA = 1.0 - smoothstep(0.004, 0.018, sdSegment(vUv, vec2(0.16, 0.28), vec2(0.84, 0.58)));
    float traceB = 1.0 - smoothstep(0.006, 0.024, sdSegment(vUv, vec2(0.25, 0.68), vec2(0.74, 0.34)));
    col += vec3(0.18, 0.32, 0.46) * (traceA * 0.070 + traceB * 0.030) * causalTrace;

    float recursion = smoothstep(1.85, 2.25, phase)
                    * (1.0 - smoothstep(3.10, 3.55, phase));
    vec2 loopUv = (vUv - vec2(0.5)) * vec2(1.0, 1.55);
    float loopRadius = length(loopUv);
    float loopAngle = atan(loopUv.y, loopUv.x);
    float loopWave = sin(loopAngle * 3.0 + uTime * 0.42) * 0.012;
    float loopLine = 1.0 - smoothstep(0.006, 0.025, abs(loopRadius - (0.285 + loopWave)));
    float loopGap = smoothstep(-0.15, 0.5, sin(loopAngle + uTime * 0.24));
    col += vec3(0.16, 0.34, 0.48) * loopLine * loopGap * recursion * 0.070;

    float rebuild = smoothstep(3.55, 4.05, phase);
    vec2 n1 = vec2(0.24, 0.28);
    vec2 n2 = vec2(0.38, 0.62);
    vec2 n3 = vec2(0.63, 0.42);
    vec2 n4 = vec2(0.78, 0.70);
    float network =
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n1, n2))) +
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n2, n3))) +
      (1.0 - smoothstep(0.004, 0.020, sdSegment(vUv, n3, n4)));
    float nodes =
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n1))) +
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n2))) +
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n3))) +
      (1.0 - smoothstep(0.010, 0.032, length(vUv - n4)));
    col += vec3(0.20, 0.36, 0.42) * network * rebuild * 0.035;
    col += vec3(0.34, 0.48, 0.46) * nodes * rebuild * 0.055;
    col *= 1.0 - stageDepth * 0.045;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Ground plane shaders
   ───────────────────────────────────────────────────────────────── */

const groundVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const groundFrag = /* glsl */ `
  precision highp float;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5, 1.0);
    float dist = length(vUv - center);
    float radialFade = 1.0 - smoothstep(0.0, 0.62, dist);
    float depthFade = smoothstep(0.0, 0.35, vUv.y);
    float alpha = radialFade * depthFade * 0.22;
    vec3 col = vec3(0.055, 0.075, 0.11);
    float scan = sin(vUv.y * 160.0 + uTime * 0.25) * 0.5 + 0.5;
    col += scan * 0.006;
    float vpDist = length(vUv - vec2(0.5, 1.0));
    float vpGlow = exp(-vpDist * 7.0) * 0.18;
    col += vec3(0.25, 0.45, 0.75) * vpGlow;
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   VoidField3D — particle field as Three.js Points
   Replaces the old 2D Canvas VoidField. Same visual:
     - 55 particles desktop / 28 mobile
     - x random across width, y in lower 55% of height
     - flicker via sin(t*speed + phase)
     - color rgba(180, 215, 255)
   Particles are positioned in NDC (-1..1) and rendered with
   gl_PointSize so they stay screen-space sized regardless of camera.
   ───────────────────────────────────────────────────────────────── */

const voidVert = /* glsl */ `
  attribute float aOpacity;
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vOpacity;

  void main() {
    /* NDC fullscreen placement: ignore camera, particles live in screen space */
    vec4 ndc = vec4(position.xy, 0.0, 1.0);
    gl_Position = ndc;

    /* Flicker opacity: sin(t * speed + phase) → [0,1] */
    float flicker = sin(uTime * aSpeed * 60.0 + aPhase) * 0.5 + 0.5;
    vOpacity = aOpacity * (0.5 + flicker * 0.5);

    /* Point size in pixels: 1.5-3.5 * pixelRatio for retina */
    gl_PointSize = aSize * 2.5 * uPixelRatio;
  }
`;

const voidFrag = /* glsl */ `
  precision highp float;
  varying float vOpacity;
  void main() {
    /* Circular soft particle: distance from point center */
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = vOpacity * (1.0 - smoothstep(0.0, 0.5, d));
    gl_FragColor = vec4(0.706, 0.843, 1.0, a);  /* rgba(180, 215, 255) */
  }
`;

function VoidField3D() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const isMobile =
      typeof window !== "undefined" &&
      (window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
       "ontouchstart" in window);
    const count = isMobile ? 28 : 55;
    const dpr   = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const positions = new Float32Array(count * 3);
    const opacities = new Float32Array(count);
    const sizes     = new Float32Array(count);
    const phases    = new Float32Array(count);
    const speeds    = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      /* x: -1..1, y: lower 55% in NDC (Y flipped: 2D top-left → NDC bottom-left) */
      positions[i * 3 + 0] = Math.random() * 2 - 1;
      positions[i * 3 + 1] = 1.0 - (0.45 + Math.random() * 0.55) * 2;
      positions[i * 3 + 2] = 0;
      opacities[i] = Math.random() * 0.18 + 0.04;
      sizes[i]     = Math.random() * 1.4 + 0.3;
      phases[i]    = Math.random() * Math.PI * 2;
      speeds[i]    = Math.random() * 0.00025 + 0.00008;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase",   new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aSpeed",   new THREE.BufferAttribute(speeds, 1));

    const u = {
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
    };

    return { geometry: geo, uniforms: u };
  }, []);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <points geometry={geometry} renderOrder={-500} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        vertexShader={voidVert}
        fragmentShader={voidFrag}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </points>
  );
}

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
   GroundPlane
   ───────────────────────────────────────────────────────────────── */

const GROUND_UNIFORMS = { uTime: { value: 0 } };

interface GroundPlaneProps {
  sceneStateRef: React.MutableRefObject<SceneState>;
}

function GroundPlane({ sceneStateRef }: GroundPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const baseY = -1.4;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (matRef.current) matRef.current.uniforms.uTime.value = t;
    if (meshRef.current) {
      const dropWorld =
        sceneStateRef.current.slabDropPx * (viewport.height / Math.max(window.innerHeight, 1));
      meshRef.current.position.y = baseY - dropWorld;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, baseY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[16, 10]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={groundVert}
        fragmentShader={groundFrag}
        uniforms={GROUND_UNIFORMS}
        transparent
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
  uMouse: { value: THREE.Vector2 };
}

interface SlabMeshProps {
  slabUniforms: SlabUniforms;
  physRef: React.MutableRefObject<PhysicsState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
  invalidateRef: React.MutableRefObject<() => void>;
}

function SlabMesh({
  slabUniforms,
  physRef,
  sceneStateRef,
  invalidateRef,
}: SlabMeshProps) {
  const slabRef    = useRef<THREE.Mesh>(null);
  const slabMatRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const slabScale = Math.min(0.58, Math.max(0.38, (viewport.width / 4.2) * 0.62));
  const slabY = viewport.width < 4 ? -1.28 : -1.45;

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

    p.pos.x += p.vel.x;
    p.pos.y += p.vel.y;
    p.pos.y = Math.max(-0.55, Math.min(0.88, p.pos.y));

    if (slabRef.current) {
      const dropWorld =
        sceneStateRef.current.slabDropPx * (viewport.height / Math.max(window.innerHeight, 1));
      slabRef.current.position.y = slabY - dropWorld;
      slabRef.current.rotation.x = p.pos.y;
      slabRef.current.rotation.y = p.pos.x;
    }
    if (slabMatRef.current) {
      slabMatRef.current.uniforms.uMouse.value.set(p.pos.x * 1.6, p.pos.y * 1.6);
    }
    /* uTime is always updated so the slab shader keeps animating */
    if (slabMatRef.current) {
      const scene = sceneStateRef.current;
      slabMatRef.current.uniforms.uTime.value = clock.getElapsedTime();
      slabMatRef.current.uniforms.uScrollProgress.value = scene.scrollProgress;
      slabMatRef.current.uniforms.uStageIndex.value = scene.stageIndex;
      slabMatRef.current.uniforms.uStageProgress.value = scene.stageProgress;
    }

    invalidateRef.current();
  });

  return (
    <mesh
      ref={slabRef}
      position={[0, slabY, 0]}
      rotation={[REST_TILT_Y, 0, 0]}
      scale={slabScale}
    >
      <boxGeometry args={[4.2, 0.035, 2.6, 1, 1, 1]} />
      <shaderMaterial
        ref={slabMatRef}
        vertexShader={slabVert}
        fragmentShader={slabFrag}
        uniforms={slabUniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WebGLSlab
   ─────────────────────────────────────────────────────────────────

   All pointer tracking is handled by Hero.tsx (window-level pointermove).
   This component only renders: background quad + ground + slab mesh.

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
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  const isTouch = useRef(
    typeof window !== "undefined" &&
    (window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
     "ontouchstart" in window)
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
        camera={{ position: [0, 2.0, 5.2], fov: 42, near: 0.1, far: 100 }}
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
        <ambientLight intensity={0.4} color="#1a2030" />
        <directionalLight position={[3, 6, 4]} intensity={0.6} color="#c8d8f0" />
        <pointLight position={[0, -2, 2]} intensity={0.08} color="#2040a0" />

        {/* NDC fullscreen background quad — fixed, no perspective */}
        <BgQuad />

        {/* Particle field — replaces 2D VoidField canvas */}
        <VoidField3D />

        <SlabMesh
          slabUniforms={slabUniforms}
          physRef={physRef}
          sceneStateRef={sceneStateRef}
          invalidateRef={invalidateRef}
        />
        <GroundPlane sceneStateRef={sceneStateRef} />
      </Canvas>
    </div>
  );
}
