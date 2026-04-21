import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";

export async function applyCursor(cwd: string, atelier: string): Promise<void> {
  const skillsSrc = join(atelier, "skills");
  const destSkills = join(cwd, ".cursor", "skills");
  await ensureDir(join(cwd, ".cursor", "rules"));
  await cp(skillsSrc, destSkills, { recursive: true });

  const mdc = `---
description: atelier-kit — always read session workflow state from .atelier/context.md before acting
alwaysApply: true
---

# atelier-kit (Cursor)

1. Read \`.atelier/context.md\` (YAML frontmatter). Use \`workflow\`, \`phase\`, \`current_task\`, and \`current_slice\` as the source of truth.
2. When \`workflow=planner\` and \`current_task\` is set, derive the active skill from that task type. Otherwise map skill by \`phase\` (see \`.atelier/METHOD.md\`).
3. Obey skill constraints: **reads** / **produces** only.
4. Prefer \`atelier-kit planner ...\`, \`atelier-kit phase\`, and \`atelier-kit status\` from the terminal when the workspace state must change.

Full protocol: \`.atelier/METHOD.md\`.
`;

  await writeText(join(cwd, ".cursor", "rules", "atelier-core.mdc"), mdc);
}
