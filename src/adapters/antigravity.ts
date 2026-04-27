import { renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";

export async function applyAntigravity(cwd: string, _atelier: string): Promise<void> {
  const body = await renderAdapterBody(cwd, "antigravity", "atelier-kit (Antigravity)");
  await writeAdapterFile(cwd, ".antigravity/atelier.md", body);
}
