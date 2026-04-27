import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyCodex(cwd: string): Promise<void> {
  const body = [
    "# AGENTS - Atelier-Kit v2 (Codex CLI)",
    "",
    activationProtocol(),
    "",
    activeProtocol(),
    "",
    commandReference(),
  ].join("
");

  await writeText(join(cwd, "AGENTS.md"), body);
}
