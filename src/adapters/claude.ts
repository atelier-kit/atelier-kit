import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { atelierCommandProtocol, atelierStateReminder } from "./common.js";

export async function applyClaude(cwd: string, atelier: string): Promise<void> {
  const md = `# atelier-kit (Claude Code)

Atelier-Kit is inactive by default. Use native behavior unless the user explicitly activates Atelier.

- ${atelierStateReminder()}
- Load only the skill named by \`.atelier/active.json\` and the active epic state.
- Full operating contract: \`.atelier/METHOD.md\`.

${atelierCommandProtocol()}

**Not affiliated with HumanLayer.**
`;

  await writeText(join(cwd, "CLAUDE.md"), md);
}
