import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  bundle: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  dts: false,
  noExternal: [/^@tunetalk\/db(?:\/.*)?$/, /^@tunetalk\/shared(?:\/.*)?$/],
});
