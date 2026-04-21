import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";

const SECTIONS = [
  "## Current state",
  "## Desired state",
  "## Patterns to follow",
  "## Patterns to avoid",
  "## Open decisions",
];

export async function validateDesignGate(cwd: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const p = join(atelierDir(cwd), "artifacts", "design.md");
  let raw = "";
  try {
    raw = await readFile(p, "utf8");
  } catch {
    return { ok: true, errors: [] };
  }
  if (raw.includes("_TBD_") || raw.length < 400) {
    return { ok: true, errors: [] };
  }
  const lines = raw.split("\n").length;
  if (lines < 120) errors.push(`design.md: only ${lines} lines (expected ~150–300)`);
  if (lines > 320) errors.push(`design.md: ${lines} lines (trim; target ≤300)`);

  for (const h of SECTIONS) {
    if (!raw.includes(h)) errors.push(`design.md missing section: ${h}`);
  }
  return { ok: errors.length === 0, errors };
}
