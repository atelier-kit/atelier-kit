import pc from "picocolors";
import { writeActiveState } from "../protocol/state.js";
import { inactiveState } from "../protocol/templates.js";

export async function cmdOff(cwd: string): Promise<void> {
  await writeActiveState(cwd, inactiveState());
  console.log(pc.green("Atelier disabled; native agent behavior is active."));
}
