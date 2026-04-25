import { join } from "node:path";
import { readContext } from "../state/context.js";
import { writeText } from "../fs-utils.js";
import { activeSkillFolder } from "../skill-loader.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyCodex(cwd: string, atelier: string): Promise<void> {
  const { meta } = await readContext(cwd);
  const folder = activeSkillFolder(meta);
  const skillPath = folder
    ? join(atelier, "skills", folder, "SKILL.md")
    : "(none — follow `.atelier/METHOD.md` only)";

  const body = `# AGENTS — atelier-kit (Codex CLI)

You are operating under **atelier-kit**. This repository is not affiliated with HumanLayer.

## Session state

- Read \`.atelier/context.md\` **first**. The YAML frontmatter is authoritative.
- ${plannerStateReminder()}
- Active skill file (if any): \`${skillPath}\`
  - When a skill applies, follow **only** that \`SKILL.md\` plus \`.atelier/METHOD.md\`.
  - Ignore other skills' bodies unless the user changes planner state or planner focus.

## Constraints

- Respect **reads** / **produces** in the skill frontmatter.

## Updates

When the user changes planner state or planner focus, re-read \`.atelier/context.md\` before continuing.

## Planner entry commands

${plannerCommandProtocol()}
`;

  await writeText(join(cwd, "AGENTS.md"), body);
}
