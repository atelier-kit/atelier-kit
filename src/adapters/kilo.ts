import { join } from "node:path";
import { readContext } from "../state/context.js";
import { activeSkillFolder } from "../skill-loader.js";
import { writeText } from "../fs-utils.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyKilo(cwd: string, atelier: string): Promise<void> {
  const { meta } = await readContext(cwd);
  const currentSkill = activeSkillFolder(meta) ?? "none";
  const root = `# atelier-kit (Kilo)

Read \`.atelier/context.md\` before acting.

- ${plannerStateReminder()}
- Current skill: ${currentSkill}
- Treat planner mode as the primary operating model.
- Skills live under \`.atelier/skills/\` and mirrored adapter folders when present.
- Full protocol: \`${join(".atelier", "METHOD.md")}\`.

${plannerCommandProtocol()}
`;

  const rule = `# atelier-kit rule

Always read \`.atelier/context.md\` first and follow the active planner skill implied by current state.

Current skill: ${currentSkill}

${plannerCommandProtocol()}
`;

  await writeText(join(cwd, "AGENTS.md"), root);
  await writeText(join(cwd, ".kilocode", "rules", "atelier-core.md"), rule);
  await writeText(join(cwd, "kilo.md"), root);
}
