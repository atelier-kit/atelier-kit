import { renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";

export async function applyKiro(cwd: string, _atelier: string): Promise<void> {
  const body = await renderAdapterBody(cwd, "kiro", "atelier-kit (Kiro)");
  await writeAdapterFile(cwd, ".kiro/steering/atelier.md", body);
}
