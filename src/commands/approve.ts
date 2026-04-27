import pc from "picocolors";
import { readFile } from "node:fs/promises";
import { planSlicesToStateSlices, parsePlanDocument } from "../protocol/gates.js";
import { epicArtifactPath } from "../protocol/paths.js";
import { nowIso } from "../protocol/templates.js";
import {
  activeStateFromEpic,
  getActiveEpicContext,
  transitionEpicState,
  writeActiveState,
  writeEpicState,
} from "../protocol/workspace.js";

export async function cmdApprove(cwd: string): Promise<void> {
  const { epicId, state } = await getActiveEpicContext(cwd);
  if (!["planning", "awaiting_approval"].includes(state.status)) {
    throw new Error(`Cannot approve while epic status is ${state.status}`);
  }

  const planContent = await readFile(epicArtifactPath(cwd, epicId, "plan.md"), "utf8");
  const planCheck = parsePlanDocument(planContent);
  if (planCheck.errors.length > 0) {
    throw new Error(`Plan approval blocked: ${planCheck.errors.join("; ")}`);
  }

  const nextState = transitionEpicState(state, "approved", {
    slices: state.slices.length > 0 ? state.slices : planSlicesToStateSlices(planCheck.slices),
    active_skill: null,
    current_slice: null,
    approval: {
      status: "approved",
      approved_by: "atelier approve",
      approved_at: nowIso(),
      notes: state.approval.notes,
    },
  });

  await writeEpicState(cwd, epicId, nextState);
  await writeActiveState(cwd, activeStateFromEpic(epicId, nextState));
  console.log(pc.green(`Approved epic: ${epicId}`));
}
