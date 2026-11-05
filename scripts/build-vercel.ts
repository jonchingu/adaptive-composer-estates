/**
 * Builds the Vercel deployment as Build Output API v3 (.vercel/output), so Vercel deploys
 * exactly what this produces:
 *
 *   static/                 the SPA (vite build → dist/client)
 *   functions/api.func/     the API bundle (vite.vercel.config.ts) + .vc-config.json
 *   config.json             files first, /api/* → the function, everything else → index.html
 *
 *   bun run build:vercel        (Vercel runs this via vercel.json "buildCommand")
 */
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const out = ".vercel/output";
const run = (cmd: string) => execSync(cmd, { stdio: "inherit" });

rmSync(out, { recursive: true, force: true });
run("vite build");
run("vite build --config vite.vercel.config.ts");

mkdirSync(`${out}/static`, { recursive: true });
cpSync("dist/client", `${out}/static`, { recursive: true });
rmSync(`${out}/static/.assetsignore`, { force: true }); // Cloudflare-only

writeFileSync(
  `${out}/functions/api.func/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: false }, null, 2),
);
writeFileSync(`${out}/functions/api.func/package.json`, JSON.stringify({ type: "module" }));

writeFileSync(
  `${out}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/assets/(.*)", headers: { "cache-control": "public, max-age=31536000, immutable" }, continue: true },
        { handle: "filesystem" },
        { src: "/api(?:/.*)?", dest: "/api" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);
console.log(`Wrote ${out}`);
