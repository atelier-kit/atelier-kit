import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyCursor(cwd: string, atelier: string): Promise<void> {
  await ensureDir(join(cwd, ".cursor"));
  await ensureDir(join(cwd, ".cursor", "rules"));
  await cp(join(atelier, "skills"), join(cwd, ".cursor", "skills"), { recursive: true });

  const mdc = `---
description: atelier-kit planning protocol v2
alwaysApply: true
---

# Atelier-Kit v2 (Cursor)

${activationProtocol()}

${activeProtocol()}

${commandReference()}

Core rule: .atelier/rules/core.md
`;

  await writeText(join(cwd, ".cursor", "rules", "atelier-core.mdc"), mdc);
}
