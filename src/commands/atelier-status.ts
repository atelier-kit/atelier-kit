import pc from "picocolors";
import { readActiveJson, readAtelierJson } from "../protocol/store.js";
import { readEpicState } from "../protocol/store.js";

export async function cmdAtelierStatus(cwd: string): Promise<void> {
  const global = await readAtelierJson(cwd).catch(() => null);
  const active = await readActiveJson(cwd).catch(() => null);
  if (!global) {
    console.log(pc.red("Not initialized (missing .atelier/atelier.json)"));
    process.exitCode = 1;
    return;
  }
  if (!active) {
    console.log(pc.red("Missing .atelier/active.json"));
    process.exitCode = 1;
    return;
  }
  console.log(pc.bold("Atelier v2"));
  console.log(`  adapter: ${global.adapter}`);
  console.log(`  active: ${active.active}`);
  console.log(`  mode: ${active.mode}`);
  console.log(`  epic: ${active.active_epic ?? "(none)"}`);
  console.log(`  phase: ${active.active_phase ?? "(none)"}`);
  console.log(`  skill: ${active.active_skill ?? "(none)"}`);
  if (active.active_epic) {
    const st = await readEpicState(cwd, active.active_epic).catch(() => null);
    if (st) {
      console.log(`  status: ${st.status}`);
      console.log(`  approval: ${st.approval.status}`);
      console.log(`  write_project_code: ${st.allowed_actions.write_project_code}`);
      if (st.current_slice) console.log(`  slice: ${st.current_slice.id}`);
    }
  }
}
