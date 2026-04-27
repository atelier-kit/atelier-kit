import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { adapterInstruction, activationReminder } from "./common.js";

export async function applyCodex(cwd: string, atelier: string): Promise<void> {
  const body = `# AGENTS — atelier-kit (Codex CLI)

${activationReminder()}

${adapterInstruction()}
`;

  await writeText(join(cwd, "AGENTS.md"), body);
}
