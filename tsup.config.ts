import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/cli.ts", "atelier-cli": "src/atelier-cli.ts" },
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  sourcemap: true,
});
