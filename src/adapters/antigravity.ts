import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyAntigravity(cwd: string): Promise<void> {
  const body = [
    "# Atelier-Kit v2 (Anti-GRAVITY)",
    "",
    activationProtocol(),
    "",
    activeProtocol(),
    "",
    commandReference(),
  ].join("\n");

  await writeText(join(cwd, "AGENTS.md"), body);
  await writeText(join(cwd, "GEMINI.md"), body);
  await writeText(join(cwd, ".agent", "rules", "atelier-core.md"), body);
}
