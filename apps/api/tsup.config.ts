import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  bundle: true,
  skipNodeModulesBundle: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  external: [
    "pg",
    "drizzle-orm",
    "better-auth",
    "hono",
    "@hono/node-server",
    "@hono/node-ws",
    "argon2",
    "zod",
  ],
  noExternal: [/^@tunetalk\/db(?:\/.*)?$/, /^@tunetalk\/shared(?:\/.*)?$/],
});
