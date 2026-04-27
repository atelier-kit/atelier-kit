import pc from "picocolors";
import {
  activeStateFromEpic,
  getActiveEpicContext,
  transitionEpicState,
  writeActiveState,
  writeEpicState,
} from "../protocol/workspace.js";

export async function cmdReject(cwd: string, reason: string): Promise<void> {
  const { epicId, state } = await getActiveEpicContext(cwd);
  const nextState = transitionEpicState(state, "planning", {
    active_skill: "planner",
    current_slice: null,
    approval: {
      status: "rejected",
      approved_by: null,
      approved_at: null,
      notes: reason,
    },
  });
  await writeEpicState(cwd, epicId, nextState);
  await writeActiveState(cwd, activeStateFromEpic(epicId, nextState));
  console.log(pc.yellow(`Rejected epic ${epicId}: ${reason}`));
}
