import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readContext } from "../state/context.js";
import { writeText } from "../fs-utils.js";
import { activeSkillFolder } from "../skill-loader.js";
import { plannerCommandProtocol } from "./common.js";

export async function applyGeneric(
  cwd: string,
  atelier: string,
): Promise<void> {
  const { meta } = await readContext(cwd);
  const method = await readFile(join(atelier, "METHOD.md"), "utf8").catch(
    () => "",
  );
  const folder = activeSkillFolder(meta);
  let skillBody = "";
  if (folder) {
    const sp = join(atelier, "skills", folder, "SKILL.md");
    try {
      skillBody = await readFile(sp, "utf8");
    } catch {
      skillBody = "";
    }
  }

  const out = `atelier-kit — generated planner prompt (generic adapter)
Not affiliated with HumanLayer.

=== .atelier/context.md (authoritative) ===
workflow: ${meta.workflow}
phase: ${meta.phase}
current_epic: ${meta.current_epic ?? "null"}
current_task: ${meta.current_task ?? "null"}
current_slice: ${meta.current_slice ?? "null"}
gate_pending: ${meta.gate_pending ?? "null"}
returns: ${meta.returns.length}

=== METHOD.md ===
${method}

=== Planner commands ===
${plannerCommandProtocol()}

=== Active skill (${folder ?? "none"}) ===
${skillBody || "(follow METHOD.md only)"}
`;

  await writeText(join(cwd, "atelier-system-prompt.txt"), out);
}
