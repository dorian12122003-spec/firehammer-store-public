import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src");
const catalogSource = join(root, "catalog-source", "games");
const output = join(root, "dist");

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

const gameFiles = (await readdir(catalogSource))
  .filter((name) => name.endsWith(".json"))
  .sort((a, b) => a.localeCompare(b));
const games = [];
for (const file of gameFiles) {
  const game = JSON.parse(await readFile(join(catalogSource, file), "utf8"));
  games.push(game);
  const target = join(output, "catalog", "games", `${game.gameId}.json`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(game, null, 2)}\n`, "utf8");
}

const index = {
  schema: "firehammer-store-catalog-v1",
  publisher: "Shadow of the Moon Studios",
  distributionPlatform: "Firehammer",
  games: games.map(({ gameId, displayName, currentStableVersion, releaseChannel, supportedOperatingSystems }) => ({
    gameId,
    displayName,
    currentStableVersion,
    releaseChannel,
    supportedOperatingSystems,
    record: `/catalog/games/${gameId}.json`
  }))
};
await mkdir(join(output, "catalog"), { recursive: true });
await writeFile(join(output, "catalog", "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
