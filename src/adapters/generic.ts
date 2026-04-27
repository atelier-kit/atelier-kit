import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { activationProtocol, activeProtocol, commandReference } from "./common.js";

export async function applyGeneric(cwd: string, _atelier: string): Promise<void> {
  const out = [
    "atelier-kit - generic planning protocol prompt",
    "",
    activationProtocol(),
    "",
    activeProtocol(),
    "",
    commandReference(),
    "",
    "Authoritative files live under `.atelier/`. The source of truth for an active epic is `.atelier/epics/<active_epic>/state.json`.",
  ].join("\n");

  await writeText(join(cwd, "atelier-system-prompt.txt"), out);
}
