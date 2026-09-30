import { build } from "esbuild";

const common = {
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome116",
  minify: true,
  legalComments: "none",
};

await build({
  ...common,
  entryPoints: ["src/background.js"],
  outfile: "extension/background.js",
  banner: { js: "// Eckblick AI – gebaut aus src/background.js (npm run build). Nicht direkt bearbeiten." },
});
await build({
  ...common,
  entryPoints: ["src/options.js"],
  outfile: "extension/options.js",
  banner: { js: "// Eckblick AI – gebaut aus src/options.js (npm run build). Nicht direkt bearbeiten." },
});
console.log("✓ extension/background.js und extension/options.js gebaut");
