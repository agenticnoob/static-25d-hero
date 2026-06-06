import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

test("package scripts expose dedicated lint and formatting checks", async () => {
  const packageJson = await readJson("package.json");

  assert.equal(packageJson.scripts.lint, "eslint .");
  assert.equal(packageJson.scripts["lint:fix"], "eslint . --fix");
  assert.equal(packageJson.scripts["format:check"], "prettier --check .");
  assert.equal(packageJson.scripts.format, "prettier --write .");
  assert.match(packageJson.scripts.check, /npm run lint/);
  assert.match(packageJson.scripts.check, /npm run format:check/);
  assert.match(packageJson.scripts.check, /npm run typecheck/);
  assert.match(packageJson.scripts.check, /npm test/);
});

test("eslint and prettier configuration files are present", async () => {
  await access("eslint.config.mjs");
  await access(".prettierrc.json");
  await access(".prettierignore");
});

test("code quality dev dependencies are pinned in package metadata", async () => {
  const packageJson = await readJson("package.json");

  assert.ok(packageJson.devDependencies.eslint);
  assert.ok(packageJson.devDependencies["eslint-config-next"]);
  assert.ok(packageJson.devDependencies.prettier);
});
