"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────────
   Slab vertex shader
   ───────────────────────────────────────────────────────────────── */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Slab fragment shader — full quality
   ───────────────────────────────────────────────────────────────── */

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
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

    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Ground shaders
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
    float alpha = smoothstep(1.0, 0.2, vUv.y) * 0.18;
    vec3 col = vec3(0.06, 0.08, 0.12);
    float scan = sin(vUv.y * 120.0 + uTime * 0.3) * 0.5 + 0.5;
    col += scan * 0.008;
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ─────────────────────────────────────────────────────────────────
   Scene — time-driven uniforms update, mouse applied externally
   ───────────────────────────────────────────────────────────────── */

const GROUND_UNIFORMS = { uTime: { value: 0 } };

function Scene({
  slabUniforms,
  gndUniforms,
}: {
  slabUniforms: { uTime: { value: number }; uMouse: { value: THREE.Vector2 } };
  gndUniforms:  { uTime: { value: number } };
}) {
  const gndRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    slabUniforms.uTime.value = t;
    gndUniforms.uTime.value = t;
  });

  return (
    <>
      {/* Slab — rotation/mouse applied imperatively via slabRef */}
      <mesh>
        <boxGeometry args={[4.2, 0.035, 2.6, 1, 1, 1]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={slabUniforms}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Ground plane */}
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 6]} />
        <shaderMaterial
          ref={gndRef}
          vertexShader={groundVert}
          fragmentShader={groundFrag}
          uniforms={GROUND_UNIFORMS}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   WebGLSlab — mouse tracking + invalidate driver
   All mouse/rotation logic lives in DOM events on the outer div.
   Three.js refs used imperatively — no React state, no re-renders.
   ───────────────────────────────────────────────────────────────── */

export default function WebGLSlab() {
  const invalidateRef = useRef<() => void>(() => {});
  const slabRef = useRef<THREE.Mesh>(null);
  const slabMat = useRef<THREE.ShaderMaterial>(null);
  const mouse    = useRef({ x: 0, y: 0 });
  const target   = useRef({ x: 0, y: 0 });

  const slabUniforms = useMemo(
    () => ({
      uTime:  { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    target.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    target.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouse.current.x += (target.current.x - mouse.current.x) * 0.055;
    mouse.current.y += (target.current.y - mouse.current.y) * 0.055;

    if (slabMat.current) {
      slabMat.current.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
    }
    if (slabRef.current) {
      slabRef.current.rotation.x +=
        (mouse.current.y * 0.12 - slabRef.current.rotation.x) * 0.055;
      slabRef.current.rotation.y +=
        (mouse.current.x * 0.18 - slabRef.current.rotation.y) * 0.055;
    }

    invalidateRef.current();
  };

  const handlePointerLeave = () => {
    target.current.x = 0;
    target.current.y = 0;
    mouse.current.x += (0 - mouse.current.x) * 0.055;
    mouse.current.y += (0 - mouse.current.y) * 0.055;
    if (slabMat.current) {
      slabMat.current.uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
    }
    if (slabRef.current) {
      slabRef.current.rotation.x += (0 - slabRef.current.rotation.x) * 0.055;
      slabRef.current.rotation.y += (0 - slabRef.current.rotation.y) * 0.055;
    }
    invalidateRef.current();
  };

  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "auto", zIndex: 5 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ position: [0, 1.8, 5.2], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        onCreated={({ invalidate }) => {
          invalidateRef.current = invalidate;
          invalidate();
        }}
      >
        <ambientLight intensity={0.4} color="#1a2030" />
        <directionalLight position={[3, 6, 4]} intensity={0.6} color="#c8d8f0" />
        <pointLight position={[0, -2, 2]} intensity={0.08} color="#2040a0" />

        {/* Slab — imperative ref for rotation */}
        <mesh ref={slabRef} position={[0, 0, 0]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[4.2, 0.035, 2.6, 1, 1, 1]} />
          <shaderMaterial
            ref={slabMat}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={slabUniforms}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Ground plane */}
        <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 6]} />
          <shaderMaterial
            vertexShader={groundVert}
            fragmentShader={groundFrag}
            uniforms={GROUND_UNIFORMS}
            transparent
            depthWrite={false}
          />
        </mesh>
      </Canvas>
    </div>
  );
}
