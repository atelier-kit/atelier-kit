import { readContext } from "../state/context.js";
import { writeText } from "../fs-utils.js";
import { plannerCommandProtocol, plannerStateReminder } from "./common.js";

export async function applyAntigravity(cwd: string): Promise<void> {
  const { meta } = await readContext(cwd);
  const body = `# atelier-kit (Anti-GRAVITY)

Read \`.atelier/context.md\` first. ${plannerStateReminder()}

Active state:
- workflow: ${meta.workflow}
- phase: ${meta.phase}
- current_task: ${meta.current_task ?? "—"}
- current_slice: ${meta.current_slice ?? "—"}

${plannerCommandProtocol()}

Always re-read \`.atelier/context.md\` after running planner or phase commands.
`;

  await writeText(`${cwd}/AGENTS.md`, body);
  await writeText(`${cwd}/GEMINI.md`, body);
  await writeText(
    `${cwd}/.agent/rules/atelier-core.md`,
    `${body}\nSee also \`.atelier/METHOD.md\` for the full operating contract.\n`,
  );
}
