import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Bundles the API (worker/vercel.ts) into one self-contained ESM file for a Vercel Node.js
// function. Vite rather than Vercel's own compiler because the API relies on the "@/" alias
// and import.meta.glob (the premade SVG templates). See scripts/build-vercel.ts.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  define: { global: "globalThis" },
  publicDir: false,
  ssr: { noExternal: true, target: "node" },
  build: {
    ssr: "worker/vercel.ts",
    outDir: ".vercel/output/functions/api.func",
    emptyOutDir: true,
    target: "node22",
    minify: false,
    rollupOptions: { output: { format: "esm", entryFileNames: "index.mjs" } },
  },
});
