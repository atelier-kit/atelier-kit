import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { renderAdapterBody } from "./adapter-utils.js";

export async function applyCline(cwd: string, _atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".clinerules"));
  const content = await renderAdapterBody(cwd, "cline", "atelier-kit (Cline)");

  await writeText(join(cwd, ".clinerules", "atelier-core.md"), content);
}
