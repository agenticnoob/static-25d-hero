import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

async function loadInteractionModule() {
  const sourcePath = path.resolve("src/lib/interaction.ts");
  const source = await readFile(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
  }).outputText;

  const dir = await mkdtemp(path.join(tmpdir(), "interaction-test-"));
  const modulePath = path.join(dir, "interaction.mjs");
  await writeFile(modulePath, compiled, "utf8");

  try {
    return await import(modulePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const interaction = await loadInteractionModule();

test("maps normalized progress into the five scroll stages", () => {
  const cases = [
    [0, "observation", 0],
    [0.2, "causality", 0],
    [0.4, "recursion", 0],
    [0.6, "selfReference", 0],
    [0.8, "reconstruction", 0],
    [1, "reconstruction", 1],
  ];

  for (const [progress, stage, stageProgress] of cases) {
    assert.deepEqual(interaction.getScrollStage(progress), {
      stage,
      stageProgress,
    });
  }
});

test("clamps out-of-range and invalid progress before stage mapping", () => {
  assert.equal(interaction.clamp01(-0.3), 0);
  assert.equal(interaction.clamp01(1.8), 1);
  assert.equal(interaction.clamp01(Number.NaN), 0);
  assert.equal(interaction.clamp01(Number.POSITIVE_INFINITY), 1);
  assert.equal(interaction.clamp01(Number.NEGATIVE_INFINITY), 0);

  assert.deepEqual(interaction.getScrollStage(Number.NaN), {
    stage: "observation",
    stageProgress: 0,
  });
});

test("keeps cinematic stage progress held at the start and end", () => {
  assert.deepEqual(interaction.getCinematicScrollStage(0), {
    stage: "observation",
    stageProgress: 0,
  });

  assert.deepEqual(interaction.getCinematicScrollStage(1), {
    stage: "reconstruction",
    stageProgress: 1,
  });
});
