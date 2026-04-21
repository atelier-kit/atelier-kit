import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readContext } from "../state/context.js";
import { writeText } from "../fs-utils.js";
import { activeSkillFolder } from "../skill-loader.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyWindsurf(
  cwd: string,
  atelier: string,
): Promise<void> {
  const { meta } = await readContext(cwd);
  const folder = activeSkillFolder(meta);
  let skillSnippet = "";
  if (folder) {
    const sp = join(atelier, "skills", folder, "SKILL.md");
    try {
      skillSnippet = await readFile(sp, "utf8");
    } catch {
      skillSnippet = "(skill file missing)";
    }
  }

  const rules = `# atelier-kit — .windsurfrules

Not affiliated with HumanLayer.

## Global

- Authoritative session state: \`.atelier/context.md\` (YAML). ${plannerStateReminder()}
- Full protocol: \`.atelier/METHOD.md\`.
- ${plannerCommandProtocol()}

---

## Current workflow: ${meta.workflow}
## Planner state: ${meta.planner_state}
## Current task: ${meta.current_task ?? "—"}

${folder ? `### Embedded skill (\`${folder}\`)\n\n${skillSnippet}` : "### No planner skill resolved; follow METHOD and context state"}

---

When planner focus changes, the user should run \`atelier-kit planner ...\` commands and then continue from the refreshed state.
`;

  await writeText(join(cwd, ".windsurfrules"), rules);
}
