import { renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";

export async function applyCodex(cwd: string, atelier: string): Promise<void> {
  const body = await renderAdapterBody(cwd, "codex", "AGENTS — atelier-kit (Codex CLI)");
  await writeAdapterFile(cwd, "AGENTS.md", body);
}
