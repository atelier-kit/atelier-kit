import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";

export async function applyCursor(cwd: string, atelier: string): Promise<void> {
  const skillsSrc = join(atelier, "skills");
  const destSkills = join(cwd, ".cursor", "skills");
  await ensureDir(join(cwd, ".cursor", "rules"));
  await cp(skillsSrc, destSkills, { recursive: true });

  const mdc = `---
description: atelier-kit — always read session phase from .atelier/context.md before acting
alwaysApply: true
---

# atelier-kit (Cursor)

1. Read \`.atelier/context.md\` (YAML frontmatter). Use field \`phase\` as the source of truth.
2. Load the matching skill under \`.cursor/skills/<name>/SKILL.md\` (questions, researcher, market-researcher, designer, planner, implementer, reviewer, chronicler) according to \`phase\` (see \`.atelier/METHOD.md\` mapping).
3. Obey skill constraints: **reads** / **produces** only.
4. Prefer \`atelier-kit phase\` / \`atelier-kit status\` from the terminal when the workspace state must change.

Full protocol: \`.atelier/METHOD.md\`.
`;

  await writeText(join(cwd, ".cursor", "rules", "atelier-core.mdc"), mdc);
}
