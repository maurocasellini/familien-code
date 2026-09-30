import { build } from "esbuild";

await build({
  entryPoints: ["src/background.js"],
  outfile: "extension/background.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome116",
  minify: true,
  legalComments: "none",
  banner: { js: "// Eckblick AI – gebaut aus src/background.js (npm run build). Nicht direkt bearbeiten." },
});
console.log("✓ extension/background.js gebaut");
