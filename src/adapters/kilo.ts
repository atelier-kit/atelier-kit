import { renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";

export async function applyKilo(cwd: string, _atelier: string): Promise<void> {
  const body = await renderAdapterBody(cwd, "kilo", "atelier-kit (Kilo Code)");
  await writeAdapterFile(cwd, ".kilocode/rules/atelier.md", body);
}
