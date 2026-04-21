import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

export async function tempDir(): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const path = await mkdtemp(join(tmpdir(), "atelier-kit-"));
  return {
    path,
    cleanup: () => rm(path, { recursive: true, force: true }),
  };
}

export function kitPath(): string {
  return join(repoRoot, "kit");
}
