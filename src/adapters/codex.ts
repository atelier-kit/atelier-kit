import { join } from "node:path";
import { readContext } from "../state/context.js";
import { writeText } from "../fs-utils.js";
import { activeSkillFolder } from "../skill-loader.js";

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
- Use \`workflow\`, \`phase\`, and \`current_task\` together to determine the active skill.
- Active skill file (if any): \`${skillPath}\`
  - When a skill applies, follow **only** that \`SKILL.md\` plus \`.atelier/METHOD.md\`.
  - Ignore other skills' bodies unless the user changes the planner focus or runs \`atelier-kit phase <name>\`.

## Constraints

- Respect **reads** / **produces** in the skill frontmatter.
- Researcher phase: never read \`.atelier/brief.md\`.

## Updates

When the user changes phase or planner focus, re-read \`.atelier/context.md\` before continuing.
`;

  await writeText(join(cwd, "AGENTS.md"), body);
}
