import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
execFileSync(process.execPath, [join(root, "scripts", "build.mjs")]);
const read = path => readFile(join(root, "dist", path), "utf8");
const catalog = JSON.parse(await read("catalog/index.json"));

test("homepage truthfully presents the publication pause", async () => {
  const home = await read("index.html");
  assert.match(home, /Firehammer Store/);
  assert.match(home, /Created by Dorian Cockrel/);
  assert.match(home, /No active releases/);
  assert.match(home, /© 2026 Dorian Cockrel/);
  assert.doesNotMatch(home, /Shadow of the Moon Studios|Neon Orbit|WillowCreek|Willow Creek/);
});

test("public catalog contains no unfinished or withdrawn product", () => {
  assert.equal(catalog.schema, "firehammer-store-catalog-v2");
  assert.equal(catalog.creator, "Dorian Cockrel");
  assert.equal(catalog.publicationStatus, "paused");
  assert.deepEqual(catalog.products, []);
  assert.deepEqual(catalog.games, []);
});

test("withdrawn acquisition redirects and pages are absent", async () => {
  const redirects = await read("_redirects");
  assert.doesNotMatch(redirects, /neon-orbit|Shadow-of-the-Moon/i);
  await assert.rejects(stat(join(root, "dist", "games", "neon-orbit", "index.html")));
  await assert.rejects(stat(join(root, "dist", "assets", "Shadow-of-the-Moon-Studios.png")));
});

test("design remains responsive and accessible", async () => {
  const css = await read("styles.css");
  const home = await read("index.html");
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(home, /<nav aria-label="Primary navigation">/);
  assert.match(home, /aria-label="Firehammer Store home"/);
});

test("public export contains no secrets, local paths, binaries, or oversized files", async () => {
  const forbidden = /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|encrypted secret key|passphrase|OneDrive|C:\\\\Users|ShadowMoonEmergencyBackup|TEST-ONLY|\.git/i;
  async function walk(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
    }
    return files;
  }
  for (const path of await walk(join(root, "dist"))) {
    const info = await stat(path);
    assert.ok(info.size < 25 * 1024 * 1024, `${path} exceeds the hosting limit`);
    assert.doesNotMatch(path, /\.(?:exe|zip|msi|pdb|dll)$/i);
    if (!path.endsWith(".png")) assert.doesNotMatch(await readFile(path, "utf8"), forbidden);
  }
});

test("catalog updater fails closed while publication is paused", async () => {
  const updater = await readFile(join(root, "scripts", "add-release.mjs"), "utf8");
  assert.match(updater, /publicationState\.status !== "active"/);
  assert.match(updater, /Public product publication is paused/);
});

test("catalog build remains generic and deterministic", async () => {
  const before = await read("catalog/index.json");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")]);
  assert.equal(await read("catalog/index.json"), before);
  const builder = await readFile(join(root, "scripts", "build.mjs"), "utf8");
  assert.match(builder, /readRecords\(gamesSource\)/);
  assert.match(builder, /readRecords\(productsSource\)/);
  assert.doesNotMatch(builder, /neon-orbit/);
});
