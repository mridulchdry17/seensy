// Bundles the extension into dist/.
//   node build.mjs            → dist/ for "Load unpacked" (keeps the manifest key = fixed extension ID)
//   node build.mjs --watch    → same, rebuilding on change
//   node build.mjs --store    → dist/ without the key + seensy-store.zip for the Edge/Chrome stores
//                               (stores assign their own ID; add its redirect URI in Google Cloud)
import { context, build } from "esbuild";
import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const watch = process.argv.includes("--watch");
const store = process.argv.includes("--store");
const STORE_ZIP = "seensy-store.zip";

await rm("dist", { recursive: true, force: true });
await mkdir("dist");
await cp("static", "dist", { recursive: true });
// InboxSDK injects this into Gmail's page world (MV3 requirement).
await cp("node_modules/@inboxsdk/core/pageWorld.js", "dist/pageWorld.js");

const options = {
  entryPoints: {
    content: "src/content/index.ts",
    background: "src/background/index.ts",
    popup: "src/popup/popup.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  logLevel: "info",
};

if (watch) {
  await (await context(options)).watch();
} else {
  await build(options);
}

if (store) {
  const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
  delete manifest.key;
  // Staging and localhost are for development builds only.
  manifest.externally_connectable.matches = ["https://seensy.vercel.app/*"];
  await writeFile("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

  await rm(STORE_ZIP, { force: true });
  const zip = spawnSync("zip", ["-qr", `../${STORE_ZIP}`, "."], { cwd: "dist", stdio: "inherit" });
  if (zip.status !== 0) throw new Error("zip failed; is the `zip` command installed?");
  console.log(`\nStore package: frontend/extension/${STORE_ZIP} (manifest v${manifest.version}, no key)`);
}
