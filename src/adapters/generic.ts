import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readContext } from "../state/context.js";
import { writeText } from "../fs-utils.js";
import { phaseToSkillFolder } from "../skill-loader.js";

export async function applyGeneric(
  cwd: string,
  atelier: string,
): Promise<void> {
  const { meta } = await readContext(cwd);
  const method = await readFile(join(atelier, "METHOD.md"), "utf8").catch(
    () => "",
  );
  const folder = phaseToSkillFolder(meta.phase);
  let skillBody = "";
  if (folder) {
    const sp = join(atelier, "skills", folder, "SKILL.md");
    try {
      skillBody = await readFile(sp, "utf8");
    } catch {
      skillBody = "";
    }
  }

  const out = `atelier-kit — generated system prompt (generic adapter)
Not affiliated with HumanLayer.

=== .atelier/context.md (authoritative) ===
phase: ${meta.phase}
gate_pending: ${meta.gate_pending ?? "null"}
returns: ${meta.returns.length}

=== METHOD.md ===
${method}

=== Active skill (${folder ?? "none"}) ===
${skillBody || "(follow METHOD.md only)"}
`;

  await writeText(join(cwd, "atelier-system-prompt.txt"), out);
}
