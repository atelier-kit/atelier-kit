import { cp } from "node:fs/promises";
import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyClaude(cwd: string, atelier: string): Promise<void> {
  const skillsSrc = join(atelier, "skills");
  const destSkills = join(cwd, ".claude", "skills");
  await cp(skillsSrc, destSkills, { recursive: true });

  const md = `# atelier-kit (Claude Code)

Before any tool use or code change, read \`.atelier/context.md\` (frontmatter) to learn the current planner state.

- Skills are vendored into \`.claude/skills/\`.
- Prefer the skill implied by \`.atelier/context.md → current_task\`, \`current_slice\`, and planner state.
- ${plannerStateReminder()}
- Full operating contract: \`.atelier/METHOD.md\`.

${plannerCommandProtocol()}

**Not affiliated with HumanLayer.**
`;

  await writeText(join(cwd, "CLAUDE.md"), md);
}
