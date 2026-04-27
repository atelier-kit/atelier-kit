import { renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";

export async function applyGeminiCli(cwd: string, _atelier: string): Promise<void> {
  const body = await renderAdapterBody(cwd, "gemini-cli", "atelier-kit (Gemini CLI)");
  await writeAdapterFile(cwd, "GEMINI.md", body);
}
