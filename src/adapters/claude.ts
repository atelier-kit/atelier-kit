import { cp } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";
import { protocolV2Installed } from "../protocol/validator.js";

export async function applyClaude(cwd: string, atelier: string): Promise<void> {
  if (await protocolV2Installed(cwd)) {
    const core = await readFile(join(atelier, "rules", "core.md"), "utf8").catch(() => "");
    const adapter = await readFile(
      join(atelier, "rules", "adapters", "claude-code.md"),
      "utf8",
    ).catch(() => "");
    const md = `# atelier-kit v2 (Claude Code)

${core}

---

${adapter}

- \`/plan\` = native planning only.
- \`/atelier ...\` = use \`atelier new\` then \`.atelier/epics/<slug>/state.json\`.
- Load skills from \`.atelier/skills/<active_skill>.md\` only (on demand).

**CLI:** \`atelier status\`, \`atelier validate\`, \`atelier approve\`, \`atelier execute\`.

**Not affiliated with HumanLayer.**
`;
    await writeText(join(cwd, "CLAUDE.md"), md);
    return;
  }

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
