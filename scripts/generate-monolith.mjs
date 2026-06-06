import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

const outPath = resolve("public/models/monolith.glb");

if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;

    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer();
      this.onloadend?.();
    }

    async readAsDataURL(blob) {
      const buffer = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type};base64,${buffer.toString("base64")}`;
      this.onloadend?.();
    }
  };
}

function hash3(x, y, z) {
  return Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123 % 1;
}

function roughenGeometry(geometry, amount) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const z = position.getZ(index);
    const noise = hash3(Math.floor(x * 18), Math.floor(y * 18), Math.floor(z * 18)) - 0.5;
    position.setXYZ(
      index,
      x + normal.getX(index) * noise * amount,
      y + normal.getY(index) * noise * amount,
      z + normal.getZ(index) * noise * amount,
    );
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function material(name, color, roughness = 0.9, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    roughness,
    metalness,
  });
}

const stone = material("obsidian_stone", "#24241f", 0.94);
const deepShadow = material("deep_cut_shadow", "#030405", 1.0);
const warmEdge = material("warm_worn_edge", "#7f643c", 0.82, 0.04);
const hairline = material("subtle_hairline_fracture", "#4d3a23", 0.94, 0.0);

function block(name, group, position, scale, mat = stone, radius = 0.018, smoothness = 2, roughness = 0.004) {
  const geometry = new RoundedBoxGeometry(scale[0], scale[1], scale[2], smoothness, radius);
  roughenGeometry(geometry, roughness);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function lineBlock(name, group, x, y, z, width, height, depth, mat = warmEdge) {
  return block(name, group, [x, y, z], [width, height, depth], mat, 0.002, 1, 0.0004);
}

function crack(name, group, x, y, z, length, angle) {
  const mesh = lineBlock(name, group, x, y, z, 0.005, length, 0.006, hairline);
  mesh.rotation.z = angle;
  return mesh;
}

const root = new THREE.Group();
root.name = "monolith_root";
root.rotation.set(0.02, -0.035, 0.026);

block("monolith_core", root, [0, 0, 0], [1.06, 2.34, 0.42], stone, 0.035, 3, 0.010);
block("broken_plinth", root, [-0.03, -1.24, 0.035], [1.28, 0.34, 0.50], stone, 0.045, 3, 0.014);
block("top_cap", root, [-0.05, 1.06, 0.035], [1.08, 0.34, 0.48], stone, 0.035, 2, 0.010);
block("left_mass", root, [-0.62, -0.34, 0.03], [0.22, 1.18, 0.48], stone, 0.028, 2, 0.009);
block("right_mass", root, [0.62, 0.10, 0.02], [0.24, 1.58, 0.46], stone, 0.030, 2, 0.009);

[
  [0.02, 0.15, 0.244, 0.74, 1.38, 0.036],
  [0.02, 0.02, 0.282, 0.54, 0.94, 0.038],
  [0.04, -0.10, 0.322, 0.36, 0.56, 0.044],
  [0.05, -0.18, 0.370, 0.20, 0.28, 0.052],
].forEach((spec, index) => {
  block(`nested_shadow_${index}`, root, spec.slice(0, 3), spec.slice(3), deepShadow, 0.010, 1, 0.001);
});

[
  [-0.36, 0.15, 0.318, 0.035, 1.48],
  [0.40, 0.15, 0.318, 0.035, 1.48],
  [0.02, 0.88, 0.318, 0.76, 0.035],
  [0.02, -0.58, 0.318, 0.76, 0.035],
  [-0.25, 0.03, 0.358, 0.030, 0.94],
  [0.31, 0.03, 0.358, 0.030, 0.94],
  [0.03, 0.49, 0.358, 0.56, 0.030],
  [0.03, -0.43, 0.358, 0.56, 0.030],
  [-0.14, -0.10, 0.402, 0.026, 0.52],
  [0.23, -0.10, 0.402, 0.026, 0.52],
  [0.05, 0.15, 0.402, 0.36, 0.026],
  [0.05, -0.35, 0.402, 0.36, 0.026],
].forEach((spec, index) => {
  lineBlock(`nested_rim_${index}`, root, spec[0], spec[1], spec[2], spec[3], spec[4], 0.070, stone);
});

[
  [-0.50, -0.72, 0.35, 0.22, 0.13, 0.12],
  [-0.58, -1.02, 0.34, 0.18, 0.18, 0.14],
  [0.50, 0.48, 0.34, 0.18, 0.56, 0.12],
  [0.22, 0.42, 0.41, 0.25, 0.16, 0.12],
  [-0.02, -0.78, 0.40, 0.20, 0.13, 0.11],
].forEach((spec, index) => {
  block(`offset_block_${index}`, root, spec.slice(0, 3), spec.slice(3), stone, 0.018, 2, 0.006);
});

[
  [-0.55, 0.06, 0.512, 0.012, 1.92],
  [0.53, -0.06, 0.515, 0.012, 1.68],
  [-0.04, 1.22, 0.518, 0.88, 0.010],
  [0.02, -1.06, 0.522, 0.98, 0.012],
  [-0.36, -0.58, 0.528, 0.72, 0.010],
  [0.02, 0.88, 0.528, 0.76, 0.010],
].forEach((spec, index) => {
  lineBlock(`worn_edge_${index}`, root, spec[0], spec[1], spec[2], spec[3], spec[4], 0.010);
});

[
  [0.61, 0.54, 0.526, 0.24, -0.35],
  [0.63, 0.20, 0.526, 0.18, 0.18],
  [-0.47, 1.06, 0.526, 0.16, -0.62],
  [-0.18, -1.18, 0.536, 0.22, 1.08],
  [0.32, -1.17, 0.536, 0.18, -0.76],
].forEach((spec, index) => {
  crack(`hairline_crack_${index}`, root, spec[0], spec[1], spec[2], spec[3], spec[4]);
});

const scene = new THREE.Scene();
scene.add(root);

const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(scene, {
  binary: true,
  trs: false,
  onlyVisible: true,
});

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, Buffer.from(glb));
console.log(`wrote ${outPath} (${Buffer.byteLength(Buffer.from(glb))} bytes)`);
