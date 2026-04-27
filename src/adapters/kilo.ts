import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyKilo(cwd: string): Promise<void> {
  const body = [
    "# Atelier-Kit v2 (Kilo)",
    "",
    activationProtocol(),
    "",
    activeProtocol(),
    "",
    commandReference(),
  ].join("
");

  await writeText(join(cwd, "AGENTS.md"), body);
  await writeText(join(cwd, ".kilocode", "rules", "atelier-core.md"), body);
  await writeText(join(cwd, "kilo.md"), body);
}
