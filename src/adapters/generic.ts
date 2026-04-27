import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { readContext } from "../state/context.js";
import { activeJsonPath, epicStatePath } from "../protocol/paths.js";
import { protocolV2Installed } from "../protocol/validator.js";
import { plannerCommandProtocol } from "./common.js";

export async function applyGeneric(
  cwd: string,
  atelier: string,
): Promise<void> {
  if (await protocolV2Installed(cwd)) {
    let activeJson = "";
    try {
      activeJson = await readFile(activeJsonPath(cwd), "utf8");
    } catch {
      activeJson = "(missing)";
    }
    let stateSnippet = "";
    try {
      const aj = JSON.parse(activeJson);
      if (aj.active && aj.active_epic) {
        const st = await readFile(epicStatePath(cwd, aj.active_epic), "utf8");
        stateSnippet = st.slice(0, 4000);
      }
    } catch {
      stateSnippet = "(no epic state)";
    }
    const core = await readFile(join(atelier, "rules", "core.md"), "utf8").catch(() => "");

    let legacyContext = "";
    try {
      const { meta } = await readContext(cwd);
      legacyContext = `=== .atelier/context.md (planner / phased legacy) ===
workflow: ${meta.workflow}
phase: ${meta.phase}
current_epic: ${meta.current_epic ?? "null"}
current_task: ${meta.current_task ?? "null"}
current_slice: ${meta.current_slice ?? "null"}
gate_pending: ${meta.gate_pending ?? "null"}

=== Legacy planner commands (atelier-kit) ===
${plannerCommandProtocol()}
`;
    } catch {
      legacyContext = "";
    }

    const out = `atelier-kit v2 — generated prompt (generic adapter)

=== .atelier/active.json ===
${activeJson}

=== Epic state (excerpt) ===
${stateSnippet}

=== Core rules ===
${core}

${legacyContext}
=== Atelier v2 CLI ===
- atelier new "<title>" --mode quick|standard|deep
- atelier status | validate | approve | execute | next | done | pause | off
`;
    await writeText(join(cwd, "atelier-system-prompt.txt"), out);
    return;
  }

  const { meta } = await readContext(cwd);
  const method = await readFile(join(atelier, "METHOD.md"), "utf8").catch(
    () => "",
  );
  const { activeSkillFolder } = await import("../skill-loader.js");
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
