import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { renderAdapterBody } from "./adapter-utils.js";

export async function applyCursor(cwd: string, _atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".cursor", "rules"));
  const rules = await renderAdapterBody(cwd, "cursor", "atelier-kit (Cursor)");

  const mdc = `---
description: atelier-kit — opt-in planning protocol
alwaysApply: true
---

${rules}
`;

  await writeText(join(cwd, ".cursor", "rules", "atelier-core.mdc"), mdc);
}
