import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
execFileSync(process.execPath, [join(root, "scripts", "build.mjs")]);
const read = path => readFile(join(root, "dist", path), "utf8");
const game = JSON.parse(await read("catalog/games/neon-orbit.json"));
const catalog = JSON.parse(await read("catalog/index.json"));
const redirects = await read("_redirects");

test("homepage and Neon Orbit page present the public release professionally", async () => {
  const home = await read("index.html");
  const page = await read("games/neon-orbit/index.html");
  assert.match(home, /Firehammer Store/);
  assert.match(home, /Neon Orbit/);
  assert.match(home, /Firehammer Library/);
  assert.match(page, /Shadow of the Moon Studios/);
  assert.match(page, /Version 2\.0\.1/);
  assert.match(page, /Windows Authenticode: unsigned/);
  assert.match(page, /ABSTRACT KEY ART · NOT GAMEPLAY/);
  assert.match(page, /Download installer/);
  assert.match(page, /Download portable/);
});

test("catalog supports multiple product types and future platforms", () => {
  assert.equal(catalog.schema, "firehammer-store-catalog-v2");
  assert.deepEqual(catalog.products.map(product => product.productType).sort(), ["game", "platform-client"]);
  assert.equal(catalog.products.find(product => product.productId === "firehammer-library").availability, "trust-onboarding-required");
  for (const platform of ["windows-x64", "linux-x64", "linux-arm64", "android", "ios"])
    assert.ok(catalog.supportedPlatformIds.includes(platform));
});

test("catalog is deterministic and preserves the legacy game index", async () => {
  assert.equal(catalog.games.length, 1);
  assert.equal(catalog.games[0].record, "/catalog/games/neon-orbit.json");
  const before = await read("catalog/index.json");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")]);
  assert.equal(await read("catalog/index.json"), before);
});

test("Neon Orbit identity, routes, and public hashes remain exact", () => {
  assert.equal(game.gameId, "neon-orbit");
  assert.equal(game.currentStableVersion, "2.0.1");
  assert.equal(game.releaseChannel, "production/stable");
  assert.equal(game.buildCommit, "974be73ddc2d01ad3e767cbddca30bcdeccc6273");
  assert.equal(game.downloads.installer.sha256, "c533b25515e74b6dd1bce90f9de7304f3d20fbff5b135a8e09760ff8471f71c6");
  assert.equal(game.downloads.portable.sha256, "b8623cd957bd0e7ee1ca75f8591e7316b638ab85df2ef3a503d539d7314718a6");
  assert.equal(game.rootPublicKeyFingerprint, "3e5050fb0701559429b644e826b47b3e168605405de97eaa1838070b08e68d95");
  assert.equal(game.releasePublicKeyFingerprint, "29627128d64cbf12066a53746f8a8de6cad69a7c1305f1a5463ec7b4a2b41b92");
  assert.equal(game.installedFileCount, 23);
  assert.equal(game.testOnlyMarkerPresent, false);
});

test("clean routes still redirect to exact public GitHub Release assets", () => {
  for (const route of [
    "/downloads/neon-orbit/2.0.1/windows/installer",
    "/downloads/neon-orbit/2.0.1/windows/portable",
    "/downloads/neon-orbit/2.0.1/manifest",
    "/downloads/neon-orbit/2.0.1/checksums"
  ]) assert.match(redirects, new RegExp(`^${route} https://github\\.com/`, "m"));
  assert.doesNotMatch(redirects, /neon-orbit\.git|chatgpt|openai/i);
});

test("design tokens, responsive rules, and accessible structure are present", async () => {
  const css = await read("styles.css");
  const home = await read("index.html");
  for (const token of ["--canvas", "--surface", "--border", "--text", "--muted", "--ember", "--focus", "--success", "--warning"])
    assert.match(css, new RegExp(token));
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(home, /<nav aria-label="Primary navigation">/);
  assert.match(home, /aria-label="Firehammer Store home"/);
  assert.doesNotMatch(home, /<script[^>]+(?:google|analytics|segment|facebook|doubleclick)/i);
});

test("official studio artwork is the approved byte-exact PNG", async () => {
  const bytes = await readFile(join(root, "dist", "assets", "Shadow-of-the-Moon-Studios.png"));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "9c71031bdb57ba347afe9db89060c0e71c60c951a1f6427586252950ab089c3c");
});

test("public export contains no secrets, local paths, source, binaries, or oversized files", async () => {
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
    assert.ok(info.size < 25 * 1024 * 1024, `${path} exceeds the Pages limit`);
    assert.doesNotMatch(path, /\.(?:exe|zip|msi|pdb|dll)$/i);
    if (!path.endsWith(".png")) assert.doesNotMatch(await readFile(path, "utf8"), forbidden);
  }
  assert.equal((await readdir(join(root, "dist"))).includes(".git"), false);
  assert.equal((await readdir(join(root, "dist"))).includes("node_modules"), false);
});

test("catalog updater retains the verified-release contract", async () => {
  const updater = await readFile(join(root, "scripts", "add-release.mjs"), "utf8");
  assert.match(updater, /production\/stable/);
  assert.match(updater, /firehammerSignature/);
  assert.match(updater, /store-catalog\.json/);
  assert.match(updater, /releaseRepository/);
  assert.match(updater, /publisher-image/);
  assert.doesNotMatch(updater, /C:\\Users|OneDrive|Desktop/);
});

test("new catalog records do not require title-specific build behavior", async () => {
  const builder = await readFile(join(root, "scripts", "build.mjs"), "utf8");
  assert.match(builder, /readRecords\(gamesSource\)/);
  assert.match(builder, /readRecords\(productsSource\)/);
  assert.doesNotMatch(builder, /neon-orbit/);
});
