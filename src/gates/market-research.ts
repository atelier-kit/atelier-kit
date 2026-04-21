import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";

const URL_REF = /https?:\/\/[^\s)]+/i;
const TOPIC_HEADING = /^##\s+Topic:/m;

export async function validateMarketResearchGate(cwd: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const base = atelierDir(cwd);
  let raw = "";

  try {
    raw = await readFile(join(base, "artifacts", "market-research.md"), "utf8");
  } catch {
    return { ok: true, errors: [] };
  }

  if (raw.includes("_TBD_") || raw.trim().length < 40) {
    return { ok: true, errors: [] };
  }

  if (!TOPIC_HEADING.test(raw)) {
    errors.push("market-research.md should include at least one `## Topic:` section");
  }
  if (!URL_REF.test(raw)) {
    errors.push("market-research.md should include at least one source URL");
  }

  return { ok: errors.length === 0, errors };
}
