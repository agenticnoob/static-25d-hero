"use client";

import { Suspense, useEffect, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  deriveRecursiveFossilMaterialState,
  type RecursiveFossilMaterialState,
  type SceneState,
} from "@/lib/interaction";
import { sampleNarrativeCameraPose } from "@/lib/cameraMotion";
import { MONOLITH_MODEL_PATH } from "@/lib/modelAssets";

/* ─────────────────────────────────────────────────────────────────
   Camera narrative constants
   ───────────────────────────────────────────────────────────────── */

export const REST_TILT_Y = 0.18;

const MODEL_TARGET_HEIGHT = 2.46;

const CAMERA_SETTINGS = {
  compact: [1.05, 1.08, 2.42] as [number, number, number],
  desktop: [1.68, 1.44, 3.25] as [number, number, number],
  fov: 48,
  near: 0.1,
  far: 60,
};

const ROOM_OBJECT_SETTINGS = {
  slabGeometryScaleBaseFactor: 1.05,
  slabCompactScale: 0.82,
  objectScaleMax: 0.78,
  objectScaleMin: 0.34,
  viewportScaleMin: 0.44,
  viewportScaleMax: 0.76,
  viewportScaleDivisor: 4.2,
  viewportScaleMul: 0.82,
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
        (this.width / ROOM_OBJECT_SETTINGS.viewportScaleDivisor) *
          ROOM_OBJECT_SETTINGS.viewportScaleMul,
      ),
    );

    return Math.min(
      ROOM_OBJECT_SETTINGS.objectScaleMax,
      Math.max(
        ROOM_OBJECT_SETTINGS.objectScaleMin,
        slabScale * ROOM_OBJECT_SETTINGS.slabGeometryScaleBaseFactor,
      ),
    );
  }
}

/* ─────────────────────────────────────────────────────────────────
   WebGLSlab
   ─────────────────────────────────────────────────────────────────

   All pointer tracking is handled by Hero.tsx (window-level pointermove).
   This component only renders the transparent WebGL scene + monolith mesh.
   ───────────────────────────────────────────────────────────────── */

interface WebGLSlabProps {
  coreInteractionRef: React.MutableRefObject<CoreInteractionState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
  onSceneReady?: () => void;
}

export default function WebGLSlab({
  coreInteractionRef,
  sceneStateRef,
  onSceneReady,
}: WebGLSlabProps) {
  const invalidateRef = useRef<() => void>(() => {});
  const fossilStateRef = useRef<RecursiveFossilMaterialState>(
    deriveRecursiveFossilMaterialState(sceneStateRef.current),
  );

  const isTouch = useRef(
    typeof window !== "undefined" &&
      (window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
        "ontouchstart" in window),
  );
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
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
        onCreated={({ gl, invalidate: inv }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.12;
          invalidateRef.current = inv;
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={cameraPos}
          fov={CAMERA_SETTINGS.fov}
          near={CAMERA_SETTINGS.near}
          far={CAMERA_SETTINGS.far}
        />
        <directionalLight
          color="#f0dfbd"
          intensity={4.15}
          position={[2.4, 3.2, 2.8]}
          castShadow={false}
        />

        <SlabMesh
          coreInteractionRef={coreInteractionRef}
          sceneStateRef={sceneStateRef}
          fossilStateRef={fossilStateRef}
          invalidateRef={invalidateRef}
          prefersReducedMotion={prefersReducedMotion.current}
          cameraBasePosition={cameraPos}
          onSceneReady={onSceneReady}
        />
      </Canvas>
    </div>
  );
}
/* ─────────────────────────────────────────────────────────────────
   Pointer material state shape
   ───────────────────────────────────────────────────────────────── */

export interface CoreInteractionState {
  pos: THREE.Vector2;
  vel: THREE.Vector2;
  target: THREE.Vector2;
  active: boolean;
}

/* ─────────────────────────────────────────────────────────────────
   SlabMesh
   ───────────────────────────────────────────────────────────────── */

interface SlabMeshProps {
  coreInteractionRef: React.MutableRefObject<CoreInteractionState>;
  sceneStateRef: React.MutableRefObject<SceneState>;
  fossilStateRef: React.MutableRefObject<RecursiveFossilMaterialState>;
  invalidateRef: React.MutableRefObject<() => void>;
  prefersReducedMotion: boolean;
  cameraBasePosition: [number, number, number];
  onSceneReady?: () => void;
}

function SlabMesh({
  coreInteractionRef,
  sceneStateRef,
  fossilStateRef,
  invalidateRef,
  prefersReducedMotion,
  cameraBasePosition: _cameraBasePosition,
  onSceneReady,
}: SlabMeshProps) {
  void _cameraBasePosition;
  const coreRef = useRef<THREE.Group>(null);
  const cameraPositionRef = useRef(new THREE.Vector3());
  const cameraTargetRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3());
  const targetLookAtRef = useRef(new THREE.Vector3());
  const pointerRef = useRef(new THREE.Vector2(0, 0));
  const { viewport, camera } = useThree();
  const viewportProfile = useMemo(() => new SlabViewportProfile(viewport.width), [viewport.width]);
  const objectScale = viewportProfile.objectScale;
  const compactScale = viewportProfile.compactScale;

  useFrame(() => {
    const p = coreInteractionRef.current;
    const sceneState = sceneStateRef.current;
    fossilStateRef.current = deriveRecursiveFossilMaterialState(sceneState, {
      reducedMotion: prefersReducedMotion,
    });
    const railPose = sampleNarrativeCameraPose(
      sceneState.scrollProgress,
      viewportProfile.isCompact,
    );
    const targetPosition = targetPositionRef.current;
    const targetLookAt = targetLookAtRef.current;
    targetPosition.set(railPose.position[0], railPose.position[1], railPose.position[2]);
    targetLookAt.set(railPose.target[0], railPose.target[1], railPose.target[2]);

    if (cameraPositionRef.current.lengthSq() === 0) {
      cameraPositionRef.current.copy(targetPosition);
      cameraTargetRef.current.copy(targetLookAt);
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
    targetPosition.x += pointer.x * parallaxScale;
    targetPosition.y += pointer.y * parallaxScale * 0.45;
    targetLookAt.x += pointer.x * 0.045;
    targetLookAt.y += pointer.y * 0.025;

    cameraPositionRef.current.lerp(targetPosition, 0.085);
    cameraTargetRef.current.lerp(targetLookAt, 0.095);
    camera.position.copy(cameraPositionRef.current);
    camera.lookAt(cameraTargetRef.current);
    camera.rotation.z += railPose.roll;

    if (coreRef.current) {
      const stageBias = Math.max(0, Math.min(1, sceneState.scrollProgress)) * 4 - 2;
      coreRef.current.position.set(0, 0, 0);
      coreRef.current.rotation.set(
        REST_TILT_Y * 0.42 + stageBias * 0.018,
        -0.18 + sceneState.scrollProgress * 0.36,
        0.06 - stageBias * 0.012,
      );
    }

    invalidateRef.current();
  });

  return (
    <group ref={coreRef} position={[0, 0, 0]} scale={compactScale * objectScale}>
      <Suspense fallback={null}>
        <MonolithModel fossilStateRef={fossilStateRef} onSceneReady={onSceneReady} />
      </Suspense>
      <ContactShadows
        position={[0, -1.08, 0]}
        scale={4.2}
        opacity={0.22}
        blur={2.6}
        far={3.4}
        resolution={256}
        color="#020304"
      />
    </group>
  );
}

interface RecursiveFossilUniforms {
  uFossilThreshold: THREE.IUniform<number>;
  uFossilEngraving: THREE.IUniform<number>;
  uFossilFeedback: THREE.IUniform<number>;
  uFossilCompression: THREE.IUniform<number>;
  uFossilSignal: THREE.IUniform<number>;
  uFossilTime: THREE.IUniform<number>;
}

function MonolithModel({
  fossilStateRef,
  onSceneReady,
}: {
  fossilStateRef: React.MutableRefObject<RecursiveFossilMaterialState>;
  onSceneReady?: () => void;
}) {
  const gltf = useGLTF(MONOLITH_MODEL_PATH);
  const readyRef = useRef(false);
  const materialRefs = useRef<THREE.Material[]>([]);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const nextMaterials: THREE.Material[] = [];
    clone.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.material = enhanceImportedMaterial(object.material);
        if (Array.isArray(object.material)) {
          nextMaterials.push(...object.material);
        } else {
          nextMaterials.push(object.material);
        }
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = true;
      }
    });

    const bounds = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bounds.getSize(size);
    bounds.getCenter(center);

    const modelHeight = Math.max(size.y, 0.001);
    const scale = MODEL_TARGET_HEIGHT / modelHeight;
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    materialRefs.current = nextMaterials;

    return clone;
  }, [gltf.scene]);

  useEffect(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onSceneReady?.();
  }, [onSceneReady]);

  useFrame(({ clock }) => {
    for (const material of materialRefs.current) {
      const uniforms = material.userData.recursiveFossilUniforms as
        | RecursiveFossilUniforms
        | undefined;
      if (!uniforms) continue;
      updateRecursiveFossilUniforms(uniforms, fossilStateRef.current, clock.getElapsedTime());
    }
  });

  return <primitive object={scene} />;
}

function enhanceImportedMaterial(
  source: THREE.Material | THREE.Material[],
): THREE.Material | THREE.Material[] {
  if (Array.isArray(source)) {
    return source.map((material) => enhanceImportedMaterial(material) as THREE.Material);
  }

  const material = source.clone();
  material.side = THREE.FrontSide;

  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    const stoneTextures = getSharedStoneTextures();
    material.map = material.map ?? stoneTextures.colorMap;
    material.bumpMap = material.bumpMap ?? stoneTextures.bumpMap;
    material.bumpScale = Math.max(material.bumpScale, 0.026);
    material.roughnessMap = material.roughnessMap ?? stoneTextures.roughnessMap;
    material.roughness = Math.max(material.roughness, 0.74);
    material.metalness = Math.min(material.metalness, 0.1);
    material.envMapIntensity = Math.min(material.envMapIntensity || 0.72, 0.82);
    if (material instanceof THREE.MeshPhysicalMaterial) {
      material.clearcoat = Math.min(material.clearcoat, 0.18);
      material.clearcoatRoughness = Math.max(material.clearcoatRoughness, 0.72);
    }
    installRecursiveFossilShader(material);
    material.needsUpdate = true;
  }

  return material;
}

let sharedStoneTextures: ReturnType<typeof createStoneTextures> | null = null;

function getSharedStoneTextures() {
  sharedStoneTextures ??= createStoneTextures(256);
  return sharedStoneTextures;
}

function createRecursiveFossilUniforms(): RecursiveFossilUniforms {
  return {
    uFossilThreshold: { value: 0 },
    uFossilEngraving: { value: 0 },
    uFossilFeedback: { value: 0 },
    uFossilCompression: { value: 0 },
    uFossilSignal: { value: 0 },
    uFossilTime: { value: 0 },
  };
}

function updateRecursiveFossilUniforms(
  uniforms: RecursiveFossilUniforms,
  state: RecursiveFossilMaterialState,
  time: number,
) {
  uniforms.uFossilThreshold.value = state.threshold;
  uniforms.uFossilEngraving.value = state.engraving;
  uniforms.uFossilFeedback.value = state.feedback;
  uniforms.uFossilCompression.value = state.compression;
  uniforms.uFossilSignal.value = state.signal;
  uniforms.uFossilTime.value = time;
}

function installRecursiveFossilShader(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial,
) {
  material.onBeforeCompile = (shader) => {
    const uniforms = createRecursiveFossilUniforms();
    Object.assign(shader.uniforms, uniforms);
    material.userData.recursiveFossilUniforms = uniforms;

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `
          #include <common>
          varying vec2 vFossilUv;
          varying vec3 vFossilWorldPosition;
        `,
      )
      .replace(
        "#include <uv_vertex>",
        /* glsl */ `
          #include <uv_vertex>
          vFossilUv = uv;
        `,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `
          #include <begin_vertex>
          vFossilWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `
          #include <common>
          uniform float uFossilThreshold;
          uniform float uFossilEngraving;
          uniform float uFossilFeedback;
          uniform float uFossilCompression;
          uniform float uFossilSignal;
          uniform float uFossilTime;
          varying vec2 vFossilUv;
          varying vec3 vFossilWorldPosition;

          float fossilHash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          float fossilNoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(fossilHash(i), fossilHash(i + vec2(1.0, 0.0)), f.x),
              mix(fossilHash(i + vec2(0.0, 1.0)), fossilHash(i + vec2(1.0, 1.0)), f.x),
              f.y
            );
          }

          float fossilLine(float value, float center, float width) {
            return 1.0 - smoothstep(0.0, width, abs(value - center));
          }
        `,
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
          vec2 fossilUv = fract(vFossilUv * vec2(2.35, 3.35) + vec2(0.03, -0.02));
          vec2 fossilGrid = floor(fossilUv * vec2(18.0, 28.0));
          float fossilSample = fossilNoise(fossilGrid * 0.17 + uFossilTime * 0.012);
          float fossilGate = step(uFossilThreshold, fossilSample);
          float verticalTrace = fossilLine(fract(fossilUv.x * 9.0), 0.5, 0.055);
          float horizontalTrace = fossilLine(fract(fossilUv.y * 13.0), 0.5, 0.040);
          float diagonalTrace = fossilLine(fract((fossilUv.x + fossilUv.y) * 5.0), 0.5, 0.030);
          float mirrorTrace = fossilLine(fossilUv.x, 1.0 - fossilUv.y, 0.032);
          float feedbackPulse = 0.62 + sin(uFossilTime * 0.48 + fossilUv.x * 6.28318) * 0.38;
          float compressionBand = smoothstep(0.08, 0.86, fossilUv.y) * (1.0 - smoothstep(0.84, 0.98, fossilUv.y));
          float engraving = (verticalTrace * 0.45 + horizontalTrace * 0.34 + diagonalTrace * 0.22) * uFossilEngraving;
          float feedback = (mirrorTrace * 0.65 + diagonalTrace * 0.28) * uFossilFeedback * feedbackPulse;
          float compression = fossilGate * compressionBand * uFossilCompression;
          float signal = smoothstep(0.15, 0.95, uFossilSignal) * (0.40 + fossilNoise(vFossilWorldPosition.xy * 2.4) * 0.60);

          outgoingLight *= 0.76 + signal * 0.18;
          outgoingLight -= vec3(0.050, 0.045, 0.036) * compression;
          outgoingLight += vec3(0.74, 0.61, 0.38) * engraving * (0.13 + signal * 0.09);
          outgoingLight += vec3(0.96, 0.79, 0.48) * feedback * 0.15;
          outgoingLight += vec3(0.22, 0.31, 0.22) * fossilGate * uFossilSignal * 0.052;

          #include <opaque_fragment>
        `,
      );
  };

  material.customProgramCacheKey = () => "recursive-fossil-v1";
}

function createStoneTextures(size: number) {
  const color = new Uint8Array(size * size * 4);
  const scalar = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const fine = fbm(u * 28.0, v * 28.0, 5);
      const grain = fbm(u * 92.0 + 7.1, v * 92.0 - 3.7, 3);
      const veinA = 1 - smoothstep(0.012, 0.07, Math.abs(fbm(u * 5.4 + 2.4, v * 7.2, 4) - 0.56));
      const veinB =
        1 - smoothstep(0.008, 0.052, Math.abs(fbm(u * 12.0 - 1.5, v * 9.0 + 5.0, 3) - 0.63));
      const worn = Math.max(veinA * 0.5, veinB * 0.28);
      const shade = 0.54 + fine * 0.36 + grain * 0.14;
      const warm = worn * 0.42;
      const index = (y * size + x) * 4;

      color[index] = clampByte(22 * shade + 42 * warm);
      color[index + 1] = clampByte(19 * shade + 30 * warm);
      color[index + 2] = clampByte(15 * shade + 16 * warm);
      color[index + 3] = 255;

      const height = clampByte(76 + fine * 92 + grain * 42 + worn * 44);
      scalar[index] = height;
      scalar[index + 1] = clampByte(190 + fine * 54 - worn * 28);
      scalar[index + 2] = height;
      scalar[index + 3] = 255;
    }
  }

  const colorMap = makeDataTexture(color, size, true);
  const bumpMap = makeDataTexture(scalar, size, false);
  const roughnessMap = makeDataTexture(scalar, size, false);

  colorMap.repeat.set(2.6, 3.8);
  bumpMap.repeat.set(2.6, 3.8);
  roughnessMap.repeat.set(2.6, 3.8);

  return { bumpMap, colorMap, roughnessMap };
}

function makeDataTexture(data: Uint8Array, size: number, isColor: boolean): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  if (isColor) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += noise2(x * frequency, y * frequency) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / total;
}

function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return lerp2(
    lerp2(hash2(ix, iy), hash2(ix + 1, iy), ux),
    lerp2(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), ux),
    uy,
  );
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

function lerp2(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
