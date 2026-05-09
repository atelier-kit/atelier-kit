import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { readRule } from "../protocol/init.js";
import type { AdapterName } from "./types.js";
import { atelierCommandReference } from "./command-spec.js";

export async function renderAdapterBody(
  cwd: string,
  adapter: AdapterName,
  title: string,
): Promise<string> {
  const rules = await readRule(cwd, adapter === "claude" ? "claude-code" : adapter);
  return `# ${title}

Atelier-Kit is an opt-in planning protocol.

${atelierCommandReference()}

${rules}
`;
}

export async function mirrorSkills(
  cwd: string,
  adapterSkillDir: string,
): Promise<void> {
  await ensureDir(adapterSkillDir);
  await cp(join(cwd, ".atelier", "skills"), adapterSkillDir, {
    recursive: true,
    force: true,
  });
}

export async function writeAdapterFile(
  cwd: string,
  relativePath: string,
  content: string,
): Promise<void> {
  await writeText(join(cwd, relativePath), content.endsWith("\n") ? content : `${content}\n`);
}
