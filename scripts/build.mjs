import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "src");
const gamesSource = join(root, "catalog-source", "games");
const productsSource = join(root, "catalog-source", "products");
const output = join(root, "dist");

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

async function readRecords(directory) {
  try {
    const files = (await readdir(directory)).filter(name => name.endsWith(".json")).sort();
    return Promise.all(files.map(async file => JSON.parse(await readFile(join(directory, file), "utf8"))));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const publicationState = JSON.parse(await readFile(
  join(root, "catalog-source", "publication-state.json"), "utf8"));
const activeProducts = new Set(publicationState.activeProducts ?? []);
const games = (await readRecords(gamesSource)).filter(game =>
  activeProducts.has(game.gameId)).map(game => ({
  ...game,
  productType: game.productType ?? "game",
  productId: game.gameId
}));
const platformProducts = (await readRecords(productsSource)).filter(product =>
  activeProducts.has(product.productId));
const products = [...games, ...platformProducts].sort((a, b) =>
  (a.productId ?? a.gameId).localeCompare(b.productId ?? b.gameId));

for (const game of games) {
  const target = join(output, "catalog", "games", `${game.gameId}.json`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(game, null, 2)}\n`, "utf8");
}
for (const product of products) {
  const id = product.productId ?? product.gameId;
  const target = join(output, "catalog", "products", `${id}.json`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(product, null, 2)}\n`, "utf8");
}

const index = {
  schema: "firehammer-store-catalog-v2",
  creator: "Dorian Cockrel",
  publicationStatus: "paused",
  distributionPlatform: "Firehammer",
  supportedPlatformIds: ["windows-x64", "linux-x64", "linux-arm64", "android", "ios"],
  products: products.map(product => {
    const productId = product.productId ?? product.gameId;
    return {
      productId,
      productType: product.productType,
      displayName: product.displayName,
      availability: product.availability ?? "available",
      platforms: product.platforms ?? [],
      record: `/catalog/products/${productId}.json`
    };
  }),
  games: games.map(game => ({
    gameId: game.gameId,
    displayName: game.displayName,
    currentStableVersion: game.currentStableVersion,
    releaseChannel: game.releaseChannel,
    supportedOperatingSystems: game.supportedOperatingSystems,
    record: `/catalog/games/${game.gameId}.json`
  }))
};
await mkdir(join(output, "catalog"), { recursive: true });
await writeFile(join(output, "catalog", "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
