import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// One dev server: the SPA through Vite, and the Worker (worker/index.ts) in workerd with
// local D1, R2 and Queues. `vite build` outputs both; `wrangler deploy` ships them together.
//
// Workers AI (used only by ingestion) has no local emulator. `bun run dev` stays fully local and
// offline; `bun run dev:remote` (after `wrangler login`) proxies the AI binding to your account.
const remote = process.env.CF_REMOTE === "1";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare({ remoteBindings: remote })],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 3000, strictPort: true },
  // convert-units reads Node's `global`; Next used to polyfill it.
  define: { global: "globalThis" },
});
