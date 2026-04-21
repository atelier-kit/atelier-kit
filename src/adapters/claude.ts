import { cp } from "node:fs/promises";
import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyClaude(cwd: string, atelier: string): Promise<void> {
  const skillsSrc = join(atelier, "skills");
  const destSkills = join(cwd, ".claude", "skills");
  await cp(skillsSrc, destSkills, { recursive: true });

  const md = `# atelier-kit (Claude Code)

Before any tool use or code change, read \`.atelier/context.md\` (frontmatter) to learn the current **workflow** and **phase**.

- Skills are vendored into \`.claude/skills/\` — in phased workflow, follow the \`SKILL.md\` for the active phase.
- In planner workflow, prefer the skill implied by \`.atelier/context.md → current_task\` and that task's type.
- ${plannerStateReminder()}
- Full operating contract: \`.atelier/METHOD.md\`.
- User may say \`/research\`, \`/design\`, etc. — treat those as explicit phase intent triggers.

${plannerCommandProtocol()}

**Not affiliated with HumanLayer.**
`;

  await writeText(join(cwd, "CLAUDE.md"), md);
}
