import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyCline(cwd: string, atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".clinerules"));
  await cp(join(atelier, "skills"), join(cwd, ".clinerules", "skills"), { recursive: true });
  const body = [
    "# Atelier-Kit v2 (Cline)",
    "",
    activationProtocol(),
    "",
    activeProtocol(),
    "",
    commandReference(),
  ].join("\n");

  await writeText(join(cwd, ".clinerules", "atelier-core.md"), body);
}
