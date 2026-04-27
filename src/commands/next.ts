import pc from "picocolors";
import {
  activeStateFromEpic,
  getActiveEpicContext,
  writeActiveState,
  writeEpicState,
} from "../protocol/workspace.js";

export async function cmdNext(cwd: string): Promise<void> {
  const { epicId, state } = await getActiveEpicContext(cwd);
  if (state.status !== "execution") {
    throw new Error(`Cannot move to next slice while status is ${state.status}`);
  }
  if (state.current_slice) {
    throw new Error("Current slice is still active. Mark it done or clear it before advancing.");
  }
  const nextSlice = state.slices.find((slice) => slice.status === "ready" || slice.status === "draft");
  if (!nextSlice) {
    throw new Error("No ready slices remain. Move to review or mark the epic done.");
  }

  const nextState = {
    ...state,
    current_slice: nextSlice.id,
    active_skill: "implementer",
    slices: state.slices.map((slice) => slice.id === nextSlice.id
      ? { ...slice, status: "in_progress" as const }
      : slice),
  };

  await writeEpicState(cwd, epicId, nextState);
  await writeActiveState(cwd, activeStateFromEpic(epicId, nextState));
  console.log(pc.green(`Focused slice: ${nextSlice.id}`));
}
