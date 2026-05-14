import { cp } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, writeText } from "../fs-utils.js";
import { readRule } from "../protocol/init.js";
import type { AdapterName } from "./types.js";
import { atelierCommandReference } from "./command-spec.js";
import { readActiveEpic } from "../protocol/state.js";

const STATUS_BLOCK_PATTERN =
  /<!-- atelier:status -->[\s\S]*?<!-- \/atelier:status -->/;

async function renderStatusBlock(cwd: string): Promise<string> {
  let body: string;
  try {
    const { active, state } = await readActiveEpic(cwd);
    if (!active.active || !active.active_epic) {
      body = "Inactive. No active epic. Run `/atelier quick|plan|deep <goal>` to activate.";
    } else if (!state) {
      body = `Active. Epic \`${active.active_epic}\` — state.json missing; run \`atelier doctor\`.`;
    } else {
      const skill = state.active_skill ?? "(none)";
      body = [
        `Active. Epic \`${state.epic_id}\` — status \`${state.status}\`, skill \`${skill}\`, mode \`${state.mode}\`.`,
        `Read \`.atelier/epics/${state.epic_id}/state.json\` and load \`.atelier/skills/${skill}.md\`.`,
      ].join(" ");
    }
  } catch {
    body = "Inactive. (No `.atelier/` state yet.)";
  }
  return `<!-- atelier:status -->\n${body}\n<!-- /atelier:status -->`;
}

function injectStatus(content: string, statusBlock: string): string {
  if (!STATUS_BLOCK_PATTERN.test(content)) return content;
  return content.replace(STATUS_BLOCK_PATTERN, statusBlock);
}

export async function renderAdapterBody(
  cwd: string,
  adapter: AdapterName,
  title: string,
): Promise<string> {
  const resolvedAdapter = adapter === "claude" ? "claude-code" : adapter;
  const rules = await readRule(cwd, resolvedAdapter);
  const statusBlock = await renderStatusBlock(cwd);
  const withStatus = injectStatus(rules, statusBlock);
  return `# ${title}

Atelier-Kit is an opt-in planning protocol.

${atelierCommandReference(resolvedAdapter)}

${withStatus}
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
