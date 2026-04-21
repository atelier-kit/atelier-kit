import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolved bundled kit/ next to dist/cli.js (or ATELIER_KIT_ROOT override for tests).
 */
export function getKitRoot(): string {
  const override = process.env.ATELIER_KIT_ROOT;
  if (override) return override;
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "kit");
}

export const ATELIER_DIR = ".atelier";
export const CONTEXT_FILE = "context.md";
export const CONFIG_FILE = ".atelierrc";
