import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { adapterInstruction, activationReminder } from "./common.js";

export async function applyCline(cwd: string, _atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".clinerules"));

  const content = `# atelier-kit (Cline)

${activationReminder()}

${adapterInstruction()}
`;

  await writeText(join(cwd, ".clinerules", "atelier-core.md"), content);
}
