import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

function assertApprox(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 1e-12, `${label}: expected ${expected}, got ${actual}`);
}

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

  const dir = await mkdtemp(path.join(tmpdir(), "interaction-test-"));
  const modulePath = path.join(dir, "interaction.mjs");
  await writeFile(modulePath, compiled, "utf8");

  try {
    return await import(modulePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const interaction = await loadTsModule("src/lib/interaction.ts");
const homepage = await loadTsModule("src/content/homepage.ts");

test("maps normalized progress into stage order and boundaries", () => {
  assert.deepEqual(interaction.getScrollStage(0), {
    stage: "observation",
    stageProgress: 0,
  });

  const leftOfSecondStage = interaction.getScrollStage(0.2 - 1e-6);
  assert.equal(leftOfSecondStage.stage, "observation");
  assertApprox(leftOfSecondStage.stageProgress, 0.999995, "left of causality boundary");

  assert.deepEqual(interaction.getScrollStage(0.2), {
    stage: "causality",
    stageProgress: 0,
  });

  const leftOfThirdStage = interaction.getScrollStage(0.4 - 1e-6);
  assert.equal(leftOfThirdStage.stage, "causality");
  assertApprox(leftOfThirdStage.stageProgress, 0.999995, "left of recursion boundary");

  assert.deepEqual(interaction.getScrollStage(0.4), {
    stage: "recursion",
    stageProgress: 0,
  });

  const leftOfFourthStage = interaction.getScrollStage(0.6 - 1e-6);
  assert.equal(leftOfFourthStage.stage, "recursion");
  assertApprox(leftOfFourthStage.stageProgress, 0.999995, "left of selfReference boundary");

  assert.deepEqual(interaction.getScrollStage(0.6), {
    stage: "selfReference",
    stageProgress: 0,
  });

  const leftOfFifthStage = interaction.getScrollStage(0.8 - 1e-6);
  assert.equal(leftOfFifthStage.stage, "selfReference");
  assertApprox(leftOfFifthStage.stageProgress, 0.999995, "left of reconstruction boundary");

  assert.deepEqual(interaction.getScrollStage(0.8), {
    stage: "reconstruction",
    stageProgress: 0,
  });

  assert.deepEqual(interaction.getScrollStage(1), {
    stage: "reconstruction",
    stageProgress: 1,
  });
});

test("maps normalized stage strings to expected indexes", () => {
  assert.equal(interaction.getStageIndex("observation"), 0);
  assert.equal(interaction.getStageIndex("causality"), 1);
  assert.equal(interaction.getStageIndex("recursion"), 2);
  assert.equal(interaction.getStageIndex("selfReference"), 3);
  assert.equal(interaction.getStageIndex("reconstruction"), 4);
  assert.equal(interaction.getStageIndex("unknown"), -1);
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

test("keeps cinematic stage progress bounded and settled at edges", () => {
  assert.deepEqual(interaction.getCinematicScrollStage(0), {
    stage: "observation",
    stageProgress: 0,
  });

  assert.deepEqual(interaction.getCinematicScrollStage(1), {
    stage: "reconstruction",
    stageProgress: 1,
  });

  assert.deepEqual(interaction.getCinematicScrollStage(-2), {
    stage: "observation",
    stageProgress: 0,
  });
  assert.deepEqual(interaction.getCinematicScrollStage(99), {
    stage: "reconstruction",
    stageProgress: 1,
  });
});

test("homepage has exactly five stages in expected order and schema", () => {
  const sections = homepage.homepageSections;

  assert.equal(sections.length, interaction.SCROLL_STAGES.length);

  const sectionsByStage = sections.map((section) => section.stage);
  assert.deepEqual(sectionsByStage, [...interaction.SCROLL_STAGES]);

  const uniqueStages = new Set(sectionsByStage);
  assert.equal(uniqueStages.size, interaction.SCROLL_STAGES.length);

  for (const section of sections) {
    assert.equal(typeof section.kicker, "string");
    assert.equal(typeof section.title, "string");
    assert.equal(typeof section.body, "string");
  }
});

test("home page only renders CTA in reconstruction stage", () => {
  const sections = homepage.homepageSections;
  const withCta = sections.filter((section) => section.cta && section.cta.href && section.cta.label);

  assert.equal(withCta.length, 1);
  assert.equal(withCta[0].stage, "reconstruction");

  for (const section of sections) {
    if (section.stage !== "reconstruction") {
      assert.equal(section.cta, undefined);
    }
  }
});

test("homepage avoids traditional resume-style section vocabulary", () => {
  const sections = homepage.homepageSections;
  const forbidden = [
    "experience",
    "education",
    "project",
    "work history",
    "工作经历",
    "教育",
    "项目",
    "简历",
  ];

  for (const section of sections) {
    const text = `${section.kicker} ${section.title} ${section.body}`.toLowerCase();
    for (const token of forbidden) {
      assert.equal(text.includes(token), false, `${section.stage} contains forbidden token: ${token}`);
    }
  }
});
