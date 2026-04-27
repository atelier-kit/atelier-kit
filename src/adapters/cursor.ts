import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { adapterRule, coreRule } from "../protocol/templates.js";

export async function applyCursor(cwd: string, _atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".cursor", "rules"));

  const mdc = `---
description: atelier-kit — opt-in planning protocol
alwaysApply: true
---

# atelier-kit (Cursor)

${coreRule()}

${adapterRule("cursor")}

Full protocol: \`.atelier/protocol/workflow.yaml\`.
`;

  await writeText(join(cwd, ".cursor", "rules", "atelier-core.mdc"), mdc);
}
