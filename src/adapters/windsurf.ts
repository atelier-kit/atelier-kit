import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readContext } from "../state/context.js";
import { writeText } from "../fs-utils.js";
import { activeSkillFolder } from "../skill-loader.js";

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

- Authoritative session state: \`.atelier/context.md\` (YAML). Use \`workflow\`, \`current_task\`, and \`phase\` together.
- Full protocol: \`.atelier/METHOD.md\`.

---

## Current workflow: ${meta.workflow}
## Current phase: ${meta.phase}
## Current task: ${meta.current_task ?? "—"}

${folder ? `### Embedded skill (\`${folder}\`)\n\n${skillSnippet}` : "### No per-phase SKILL file (brief/ship/learn or follow METHOD)"}

---

When planner focus changes, the user should run \`atelier-kit planner focus ...\` or \`atelier-kit phase <name>\` then continue.
`;

  await writeText(join(cwd, ".windsurfrules"), rules);
}
