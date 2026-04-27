import { join } from "node:path";
import { ensureDir } from "../fs-utils.js";
import { claudeAtelierCommand } from "./command-spec.js";
import { mirrorSkills, renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";

export async function applyClaude(cwd: string, atelier: string): Promise<void> {
  const md = await renderAdapterBody(cwd, "claude-code", "atelier-kit (Claude Code)");

  await writeAdapterFile(cwd, "CLAUDE.md", md);
  await ensureDir(join(cwd, ".claude", "commands"));
  await writeAdapterFile(cwd, ".claude/commands/atelier.md", claudeAtelierCommand());
  await mirrorSkills(cwd, join(cwd, ".claude", "skills", "atelier"));
}
