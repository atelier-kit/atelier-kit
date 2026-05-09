import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { readActiveEpic, readAtelierConfig } from "../protocol/state.js";
import { readRule } from "../protocol/init.js";

export async function applyGeneric(
  cwd: string,
  _atelier: string,
): Promise<void> {
  const config = await readAtelierConfig(cwd);
  const { active, state } = await readActiveEpic(cwd);
  const rules = await readRule(cwd, config.adapter);

  const out = `atelier-kit — generated Planning Protocol prompt (generic adapter)
Not affiliated with HumanLayer.

=== Activation ===
active: ${active.active}
active_epic: ${active.active_epic ?? "null"}
active_phase: ${active.active_phase ?? "null"}
active_skill: ${active.active_skill ?? "null"}

=== Active epic ===
status: ${state?.status ?? "none"}

=== Rules ===
${rules}
`;

  await writeText(join(cwd, "atelier-system-prompt.txt"), out);
}
