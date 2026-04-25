import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";
import { readAnyPlanMarkdown } from "../state/plan-artifacts.js";

export async function validateImplementGate(cwd: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const base = atelierDir(cwd);
  let plan = "";
  let log = "";
  const fromPlan = await readAnyPlanMarkdown(cwd);
  if (fromPlan == null) {
    return { ok: true, errors: [] };
  }
  plan = fromPlan;
  try {
    log = await readFile(join(base, "artifacts", "impl-log.md"), "utf8");
  } catch {
    errors.push("impl-log.md missing while plan.md exists");
    return { ok: false, errors };
  }
  if (log.includes("_TBD_")) {
    return { ok: true, errors: [] };
  }

  const slices = [...plan.matchAll(/slice\s*\d+/gi)].length;
  if (slices === 0) {
    return { ok: true, errors: [] };
  }
  if (slices > 0) {
    for (let i = 1; i <= slices; i++) {
      if (!new RegExp(`slice\\s*${i}`, "i").test(log)) {
        errors.push(`impl-log.md missing Slice ${i} section`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
