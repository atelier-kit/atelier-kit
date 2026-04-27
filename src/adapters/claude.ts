import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyClaude(cwd: string, atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".claude"));
  await cp(join(atelier, "skills"), join(cwd, ".claude", "skills"), { recursive: true });

  const body = [
    "# Atelier-Kit v2 (Claude Code)",
    "",
    activationProtocol(),
    "",
    activeProtocol(),
    "",
    commandReference(),
    "",
    "Reference rule: `.atelier/rules/core.md`.",
  ].join("\n");

  await writeText(join(cwd, "CLAUDE.md"), body);
}
