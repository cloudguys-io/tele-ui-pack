// ESM for bundlers (lit bundled in, livekit-client and react left to the app) and a single-file IIFE
// for a <script> tag that bundles everything, including livekit-client.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { rmSync, readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
rmSync("dist", { recursive: true, force: true });

const common = { bundle: true, target: "es2022", sourcemap: true, legalComments: "eof", logLevel: "info" };

await build({
  ...common,
  entryPoints: { index: "src/index.ts", react: "src/react.tsx" },
  outdir: "dist", format: "esm", splitting: true, chunkNames: "chunks/[name]-[hash]",
  external: ["livekit-client", "react", "react/jsx-runtime"],
  jsx: "automatic",
});

await build({
  ...common,
  entryPoints: ["src/index.ts"],
  outfile: `dist/tele-call.iife.js`, format: "iife", globalName: "TeleCallUI", minify: true,
  banner: { js: `/* @tele/call-ui ${version} */` },
});

execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"], { stdio: "inherit" });

// tsc keeps the source's ".ts" specifiers in declarations; point them at the emitted ".js" names.
import { readdirSync, writeFileSync } from "node:fs";
for (const f of readdirSync("dist").filter((n) => n.endsWith(".d.ts"))) {
  const p = `dist/${f}`;
  writeFileSync(p, readFileSync(p, "utf8").replace(/(from\s+["']\.\/[\w-]+)\.tsx?(["'])/g, "$1.js$2"));
}
