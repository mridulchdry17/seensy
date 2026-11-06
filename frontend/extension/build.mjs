// Bundles the extension into dist/. `--watch` rebuilds on change (load dist/ as an unpacked extension).
import { context, build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watch = process.argv.includes("--watch");

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

if (watch) await (await context(options)).watch();
else await build(options);
