import pc from "picocolors";
import { readFile } from "node:fs/promises";
import { planSlicesToStateSlices, parsePlanDocument } from "../protocol/gates.js";
import { epicArtifactPath } from "../protocol/paths.js";
import {
  activeStateFromEpic,
  getActiveEpicContext,
  transitionEpicState,
  writeActiveState,
  writeEpicState,
} from "../protocol/workspace.js";

export async function cmdExecute(cwd: string): Promise<void> {
  const { epicId, state } = await getActiveEpicContext(cwd);
  if (state.approval.status !== "approved") {
    throw new Error("Execution requires approval.status=approved");
  }

  let slices = state.slices;
  if (slices.length === 0) {
    const planContent = await readFile(epicArtifactPath(cwd, epicId, "plan.md"), "utf8");
    const planCheck = parsePlanDocument(planContent);
    if (planCheck.errors.length > 0) {
      throw new Error(`Execution blocked: ${planCheck.errors.join("; ")}`);
    }
    slices = planSlicesToStateSlices(planCheck.slices);
  }

  const nextSlice = slices.find((slice) => slice.status === "ready")
    ?? slices.find((slice) => slice.status === "draft");
  if (!nextSlice) {
    throw new Error("Execution requires at least one ready slice");
  }

  const updatedSlices = slices.map((slice) => slice.id === nextSlice.id
    ? { ...slice, status: "in_progress" as const }
    : slice);
  const nextState = transitionEpicState(state, "execution", {
    slices: updatedSlices,
    current_slice: nextSlice.id,
    active_skill: "implementer",
  });

  await writeEpicState(cwd, epicId, nextState);
  await writeActiveState(cwd, activeStateFromEpic(epicId, nextState));
  console.log(pc.green(`Execution started for slice: ${nextSlice.id}`));
}
