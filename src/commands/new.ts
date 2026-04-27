import pc from "picocolors";
import { installAdapter } from "../adapters/index.js";
import type { AdapterName } from "../adapters/types.js";
import { createArtifactTemplates, createInitialEpicState } from "../protocol/templates.js";
import {
  activeStateFromEpic,
  parseRequestedMode,
  readAtelierConfig,
  requireInitialized,
  uniqueEpicId,
  writeActiveState,
  writeArtifacts,
  writeEpicState,
} from "../protocol/workspace.js";

export async function cmdNew(
  cwd: string,
  title: string,
  opts: { mode?: string },
): Promise<void> {
  await requireInitialized(cwd);
  const config = await readAtelierConfig(cwd);
  const mode = parseRequestedMode(opts.mode, config.default_atelier_mode);
  const epicId = await uniqueEpicId(cwd, title);
  const state = createInitialEpicState({
    epicId,
    title,
    goal: title,
    mode,
  });
  const artifacts = createArtifactTemplates({ title, mode, epicId });

  await writeArtifacts(cwd, epicId, artifacts);
  await writeEpicState(cwd, epicId, state);
  await writeActiveState(cwd, activeStateFromEpic(epicId, state));
  await installAdapter(cwd, config.adapter as AdapterName);

  console.log(pc.green(`Created epic: ${epicId}`));
  console.log(pc.dim(`Mode: ${mode}`));
  console.log(pc.dim(`Artifacts: .atelier/epics/${epicId}/`));
}
