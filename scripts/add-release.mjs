import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicationState = JSON.parse(await readFile(
  join(root, "catalog-source", "publication-state.json"), "utf8"));
if (publicationState.status !== "active")
  throw new Error("Public product publication is paused. A reviewed identity activation is required before adding a release.");
const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
const handoffPath = args.get("--handoff");
const reportPath = args.get("--report");
const releaseRepository = args.get("--release-repository");
if (!handoffPath || !reportPath || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(releaseRepository ?? "")) throw new Error("Required: --handoff, --report, and --release-repository owner/name.");
const handoff = JSON.parse(await readFile(handoffPath, "utf8"));
const report = JSON.parse(await readFile(reportPath, "utf8"));
if (handoff.schema !== "firehammer-store-handoff-v1" || report.verification !== "passed" || handoff.gameId !== report.gameId || handoff.version !== report.version) throw new Error("Handoff and report identities must describe one verified release.");
if (report.channel !== "production/stable" || handoff.firehammerSignature !== "valid") throw new Error("Only verified production/stable releases may update the Store.");
const gamePath = join(root, "catalog-source", "games", `${handoff.gameId}.json`);
let game;
try { game = JSON.parse(await readFile(gamePath, "utf8")); }
catch {
  const seedPath = join(dirname(handoffPath), "store-catalog.json");
  try { game = JSON.parse(await readFile(seedPath, "utf8")); }
  catch { throw new Error("A new game requires reviewed store-catalog.json metadata."); }
}
if (game.gameId !== handoff.gameId || game.publisher !== "Dorian Cockrel") throw new Error("Catalog seed identity mismatch.");
const version = handoff.version;
const routeBase = `/downloads/${handoff.gameId}/${version}`;
game.currentStableVersion = version;
game.releaseChannel = "production/stable";
game.buildCommit = report.buildCommit;
game.releaseDate = game.releaseDate ?? null;
game.windowsAuthenticode = "unsigned";
game.installedFileCount = report.installedFileCount;
game.testOnlyMarkerPresent = false;
game.rootPublicKeyFingerprint = handoff.rootPublicKeyFingerprint;
game.releasePublicKeyFingerprint = report.releaseKeyFingerprint;
game.artwork = `/assets/${basename(handoff.publisherLogo)}`;
game.downloads = {
  installer: { route: `${routeBase}/windows/installer`, filename: handoff.installer.filename, size: handoff.installer.size, sha256: handoff.installer.sha256 },
  portable: { route: `${routeBase}/windows/portable`, filename: handoff.portableZip.filename, size: handoff.portableZip.size, sha256: handoff.portableZip.sha256 },
  manifest: `${routeBase}/manifest`, manifestSignature: `${routeBase}/manifest-signature`, checksums: `${routeBase}/checksums`, checksumSignature: `${routeBase}/checksum-signature`, rootPublicKey: `${routeBase}/root-public-key`, releaseAuthorization: `${routeBase}/release-authorization`, authorizationSignature: `${routeBase}/authorization-signature`, storeHandoff: `${routeBase}/store-handoff`, releaseReport: `${routeBase}/release-report`, publisherImage: `${routeBase}/publisher-image`
};
await writeFile(gamePath, `${JSON.stringify(game, null, 2)}\n`, "utf8");
const artworkSource = join(dirname(handoffPath), handoff.publisherLogo);
const artworkTarget = join(root, "src", "assets", basename(handoff.publisherLogo));
await mkdir(dirname(artworkTarget), { recursive: true });
let artworkMatches = false;
try { artworkMatches = Buffer.compare(await readFile(artworkSource), await readFile(artworkTarget)) === 0; } catch {}
if (!artworkMatches) await copyFile(artworkSource, artworkTarget);
const tag = `${handoff.gameId}-v${version}`;
const releaseBase = `https://github.com/${releaseRepository}/releases/download/${tag}`;
const entries = [
  ["windows/installer", handoff.installer.filename], ["windows/portable", handoff.portableZip.filename],
  ["manifest", handoff.manifest], ["manifest-signature", handoff.manifestSignature],
  ["checksums", "SHA256SUMS.txt"], ["checksum-signature", "SHA256SUMS.txt.minisig"],
  ["root-public-key", handoff.rootPublicKey], ["release-authorization", handoff.releaseKeyAuthorization],
  ["authorization-signature", handoff.releaseKeyAuthorizationSignature], ["store-handoff", "store-handoff.json"],
  ["release-report", "release-report.json"], ["publisher-image", basename(handoff.publisherLogo)]
].map(([route, file]) => `${routeBase}/${route} ${releaseBase}/${file} 302`);
const redirectsPath = join(root, "src", "_redirects");
const existing = (await readFile(redirectsPath, "utf8")).split(/\r?\n/).filter(Boolean).filter(line => !line.startsWith(`${routeBase}/`));
await writeFile(redirectsPath, `${[...existing, ...entries].sort().join("\n")}\n`, "utf8");
console.log(`Updated ${handoff.gameId} ${version} deterministically.`);
