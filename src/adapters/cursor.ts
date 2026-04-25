import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyCursor(cwd: string, atelier: string): Promise<void> {
  const skillsSrc = join(atelier, "skills");
  const destSkills = join(cwd, ".cursor", "skills");
  await ensureDir(join(cwd, ".cursor", "rules"));
  await cp(skillsSrc, destSkills, { recursive: true });

  const mdc = `---
description: atelier-kit — always read planner state from .atelier/context.md before acting
alwaysApply: true
---

# atelier-kit (Cursor)

1. Read \`.atelier/context.md\` (YAML frontmatter). Use \`workflow\`, \`planner_mode\`, \`planner_state\`, \`current_task\`, and \`current_slice\` as the source of truth.
2. Derive the active skill from planner state: current task type during planning, planner skill while awaiting approval, implementer during execution with an active slice.
3. Obey skill constraints: **reads** / **produces** only.
4. Prefer \`atelier-kit planner ...\` and \`atelier-kit status\` from the terminal when the workspace state must change.

${plannerStateReminder()}

${plannerCommandProtocol()}

Full protocol: \`.atelier/METHOD.md\`.
`;

  await writeText(join(cwd, ".cursor", "rules", "atelier-core.mdc"), mdc);
}
