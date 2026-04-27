import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { protocolV2Installed } from "../protocol/validator.js";

export async function applyCursor(cwd: string, atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".cursor", "rules"));

  if (await protocolV2Installed(cwd)) {
    const core = await readFile(join(atelier, "rules", "core.md"), "utf8").catch(() => "");
    const adapter = await readFile(
      join(atelier, "rules", "adapters", "cursor.md"),
      "utf8",
    ).catch(() => "");
    const mdc = `---
description: Atelier-Kit v2 — opt-in planning protocol; /plan stays native
alwaysApply: true
---

${core}

---

${adapter}

## Quick reference

- \`/plan ...\` → native Cursor planning only. **Do not** create \`.atelier/epics/\` or load Atelier skills.
- \`/atelier quick|plan|deep ...\` → run \`atelier new "<title>" --mode quick|standard|deep\`, then follow \`.atelier/active.json\` and \`.atelier/epics/<slug>/state.json\`.
- Authoritative epic state: \`state.json\` (not \`context.md\`).
- Load **one** skill file: \`.atelier/skills/<active_skill>.md\` when \`active.json\` says so.
- CLI: \`atelier status\`, \`atelier validate\`, \`atelier approve\`, \`atelier execute\`.
`;
    await writeText(join(cwd, ".cursor", "rules", "atelier-protocol.mdc"), mdc);
    return;
  }

  const { cp } = await import("node:fs/promises");
  const { plannerCommandProtocol, plannerStateReminder } = await import("./common.js");
  const skillsSrc = join(atelier, "skills");
  const destSkills = join(cwd, ".cursor", "skills");
  await cp(skillsSrc, destSkills, { recursive: true }).catch(() => {});

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
