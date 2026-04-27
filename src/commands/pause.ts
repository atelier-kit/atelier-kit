import pc from "picocolors";
import {
  activeStateFromEpic,
  getActiveEpicContext,
  transitionEpicState,
  writeActiveState,
  writeEpicState,
} from "../protocol/workspace.js";

export async function cmdPause(cwd: string): Promise<void> {
  const { epicId, state } = await getActiveEpicContext(cwd);
  const nextState = transitionEpicState(state, "paused", {
    active_skill: null,
  });
  await writeEpicState(cwd, epicId, nextState);
  await writeActiveState(cwd, activeStateFromEpic(epicId, nextState));
  console.log(pc.yellow(`Paused epic: ${epicId}`));
}
