import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { adapterInstruction, activationReminder } from "./common.js";

export async function applyWindsurf(
  cwd: string,
  _atelier: string,
): Promise<void> {
  const rules = `# atelier-kit — .windsurfrules

${activationReminder()}

${adapterInstruction()}
`;

  await writeText(join(cwd, ".windsurfrules"), rules);
}
