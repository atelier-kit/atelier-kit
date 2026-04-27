import pc from "picocolors";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { nowIso } from "../protocol/templates.js";
import {
  activeStateFromEpic,
  getActiveEpicContext,
  transitionEpicState,
  writeActiveState,
  writeEpicState,
} from "../protocol/workspace.js";

export async function cmdDone(cwd: string): Promise<void> {
  const { epicId, state } = await getActiveEpicContext(cwd);
  if (state.status !== "execution" || !state.current_slice) {
    throw new Error("No active slice is currently executing");
  }

  const currentSlice = state.slices.find((slice) => slice.id === state.current_slice);
  if (!currentSlice) {
    throw new Error(`Current slice ${state.current_slice} was not found in state.json`);
  }

  const updatedSlices = state.slices.map((slice) => slice.id === currentSlice.id
    ? { ...slice, status: "done" as const }
    : slice);
  const hasRemaining = updatedSlices.some((slice) => slice.status === "ready" || slice.status === "draft");
  const nextState = hasRemaining
    ? transitionEpicState(state, "execution", {
      slices: updatedSlices,
      current_slice: null,
      active_skill: "implementer",
    })
    : transitionEpicState(state, "review", {
      slices: updatedSlices,
      current_slice: null,
      active_skill: "reviewer",
    });

  await appendFile(
    join(cwd, ".atelier", "epics", epicId, "execution-log.md"),
    `
- ${nowIso()} Completed ${currentSlice.id} (${currentSlice.title})
`,
    "utf8",
  );
  await writeEpicState(cwd, epicId, nextState);
  await writeActiveState(cwd, activeStateFromEpic(epicId, nextState));
  console.log(pc.green(`Marked slice done: ${currentSlice.id}`));
}
