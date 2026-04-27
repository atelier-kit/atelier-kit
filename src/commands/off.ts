import pc from "picocolors";
import { deactivateAtelier, getActiveEpicContext, writeEpicState } from "../protocol/workspace.js";

export async function cmdOff(cwd: string): Promise<void> {
  try {
    const { epicId, state } = await getActiveEpicContext(cwd);
    await writeEpicState(cwd, epicId, {
      ...state,
      status: state.status === "done" ? state.status : "paused",
      active_skill: null,
      allowed_actions: {
        ...state.allowed_actions,
        write_project_code: false,
        run_tests: false,
      },
    });
  } catch {
    // Nothing to persist on the epic; we still turn Atelier off.
  }
  await deactivateAtelier(cwd);
  console.log(pc.green("Atelier is now inactive."));
}
