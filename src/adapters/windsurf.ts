import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyWindsurf(cwd: string): Promise<void> {
  const body = [
    "# Atelier-Kit v2 (.windsurfrules)",
    "",
    activationProtocol(),
    "",
    activeProtocol(),
    "",
    commandReference(),
  ].join("
");

  await writeText(join(cwd, ".windsurfrules"), body);
}
