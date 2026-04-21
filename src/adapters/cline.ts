import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyCline(cwd: string, atelier: string): Promise<void> {
  const skillsSrc = join(atelier, "skills");
  const destSkills = join(cwd, ".clinerules", "skills");
  await ensureDir(join(cwd, ".clinerules"));
  await cp(skillsSrc, destSkills, { recursive: true });

  const content = `# atelier-kit (Cline)

Read \`.atelier/context.md\` before acting.

- ${plannerStateReminder()}
- Follow the skill implied by the current planner state.
- Full protocol: \`.atelier/METHOD.md\`.

${plannerCommandProtocol()}
`;

  await writeText(join(cwd, ".clinerules", "atelier-core.md"), content);
}
