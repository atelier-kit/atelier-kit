import { join } from "node:path";
import { mirrorSkills, renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";

export async function applyKilo(cwd: string, _atelier: string): Promise<void> {
  const body = await renderAdapterBody(cwd, "kilo", "atelier-kit (Kilo Code)");
  await writeAdapterFile(cwd, ".kilocode/rules/atelier.md", body);
  await mirrorSkills(cwd, join(cwd, ".kilocode", "skills", "atelier"));
}
