import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

async function loadTsModule(relativePath) {
  const sourcePath = path.resolve(relativePath);
  const source = await readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
  }).outputText;

  const dir = await mkdtemp(path.join(tmpdir(), "motion-design-test-"));
  const modulePath = path.join(dir, "module.mjs");
  await writeFile(modulePath, compiled, "utf8");

  try {
    return await import(modulePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const cameraMotion = await loadTsModule("src/lib/cameraMotion.ts");
const introReveal = await loadTsModule("src/lib/introReveal.ts");
const narrativePresence = await loadTsModule("src/lib/narrativePresence.ts");

test("camera path combines orbit, dolly, and target drift", () => {
  const start = cameraMotion.sampleNarrativeCameraPose(0, false);
  const middle = cameraMotion.sampleNarrativeCameraPose(0.5, false);
  const end = cameraMotion.sampleNarrativeCameraPose(1, false);

  assert.equal(start.position.length, 3);
  assert.equal(middle.target.length, 3);
  assert.equal(end.position.length, 3);

  const startRadius = Math.hypot(start.position[0], start.position[2]);
  const middleRadius = Math.hypot(middle.position[0], middle.position[2]);
  const endRadius = Math.hypot(end.position[0], end.position[2]);

  assert.notEqual(Math.sign(start.position[0]), Math.sign(middle.position[0]));
  assert.notEqual(Math.round(startRadius * 100), Math.round(middleRadius * 100));
  assert.notEqual(Math.round(endRadius * 100), Math.round(middleRadius * 100));
  assert.notEqual(Math.round(start.target[0] * 100), Math.round(middle.target[0] * 100));
});

test("compact camera path keeps a restrained but real dolly range", () => {
  const samples = [0, 0.25, 0.5, 0.75, 1].map((progress) =>
    cameraMotion.sampleNarrativeCameraPose(progress, true),
  );
  const radii = samples.map((sample) => Math.hypot(sample.position[0], sample.position[2]));
  const minRadius = Math.min(...radii);
  const maxRadius = Math.max(...radii);

  assert.ok(maxRadius - minRadius > 0.25);
  assert.ok(maxRadius < 2.7);
  assert.ok(minRadius > 1.4);
});

test("intro reveal config stages preloader, scene, and copy as a soft handoff", () => {
  assert.ok(introReveal.INTRO_REVEAL.sceneDelayMs < introReveal.INTRO_REVEAL.copyDelayMs);
  assert.ok(introReveal.INTRO_REVEAL.preloaderFadeMs >= 700);
  assert.ok(introReveal.INTRO_REVEAL.sceneScaleFrom > 1);
  assert.ok(introReveal.INTRO_REVEAL.sceneBlurFromPx > 0);
  assert.ok(introReveal.INTRO_REVEAL.copyDelayMs - introReveal.INTRO_REVEAL.sceneDelayMs >= 120);
});

test("first narrative section presence responds immediately while pinned", () => {
  const idle = narrativePresence.getNarrativePresence({
    index: 0,
    sectionTop: 0,
    sectionHeight: 1180,
    viewportHeight: 1000,
    scrollY: 0,
  });
  const early = narrativePresence.getNarrativePresence({
    index: 0,
    sectionTop: 0,
    sectionHeight: 1180,
    viewportHeight: 1000,
    scrollY: 180,
  });
  const later = narrativePresence.getNarrativePresence({
    index: 0,
    sectionTop: 0,
    sectionHeight: 1180,
    viewportHeight: 1000,
    scrollY: 720,
  });
  const almostGone = narrativePresence.getNarrativePresence({
    index: 0,
    sectionTop: 0,
    sectionHeight: 1180,
    viewportHeight: 1000,
    scrollY: 1210,
  });

  assert.equal(idle.progress, 0);
  assert.equal(idle.presence, 1);
  assert.equal(idle.offsetY, 0);
  assert.ok(early.progress > idle.progress);
  assert.ok(later.progress > early.progress);
  assert.ok(early.presence > 0.98);
  assert.ok(later.presence > 0.98);
  assert.ok(early.offsetY < 0);
  assert.ok(later.offsetY < early.offsetY);
  assert.ok(Math.abs(later.offsetY) > 380);
  assert.ok(almostGone.presence < 0.25);
  assert.ok(Math.abs(almostGone.offsetY) > 640);
  assert.equal(early.direction, -1);
  assert.equal(later.direction, -1);
});

test("later narrative sections fade before they finish moving upward", () => {
  const centered = narrativePresence.getNarrativePresence({
    index: 2,
    sectionTop: -150,
    sectionHeight: 1300,
    viewportHeight: 1000,
    scrollY: 1800,
  });
  const exiting = narrativePresence.getNarrativePresence({
    index: 2,
    sectionTop: -610,
    sectionHeight: 1300,
    viewportHeight: 1000,
    scrollY: 2260,
  });

  assert.ok(centered.presence > 0.95);
  assert.ok(Math.abs(centered.offsetY) < 2);
  assert.ok(exiting.presence < centered.presence);
  assert.ok(exiting.presence > 0.25);
  assert.ok(exiting.offsetY < -24);
});
