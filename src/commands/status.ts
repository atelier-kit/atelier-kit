import pc from "picocolors";
import { readActiveState, readAtelierConfig, readEpicState, requireInitialized } from "../protocol/workspace.js";

export async function cmdStatus(cwd: string): Promise<void> {
  await requireInitialized(cwd);
  const config = await readAtelierConfig(cwd);
  const active = await readActiveState(cwd);

  console.log(pc.bold("Atelier"));
  console.log(`  active:          ${active.active ? pc.green("true") : pc.dim("false")}`);
  console.log(`  mode:            ${active.mode}`);
  console.log(`  adapter:         ${config.adapter}`);
  console.log(`  default_mode:    ${config.default_atelier_mode}`);
  console.log(`  active_epic:     ${active.active_epic ?? "-"}`);
  console.log(`  active_phase:    ${active.active_phase ?? "-"}`);
  console.log(`  active_skill:    ${active.active_skill ?? "-"}`);
  console.log(`  updated_at:      ${active.updated_at ?? "-"}`);

  if (!active.active || !active.active_epic) {
    console.log(pc.dim("
Atelier is inactive. Native agent behavior should remain unchanged."));
    return;
  }

  const state = await readEpicState(cwd, active.active_epic);
  console.log(pc.bold("
Active epic"));
  console.log(`  title:           ${state.title}`);
  console.log(`  goal:            ${state.goal}`);
  console.log(`  protocol_mode:   ${state.mode}`);
  console.log(`  status:          ${state.status}`);
  console.log(`  approval:        ${state.approval.status}`);
  console.log(`  current_slice:   ${state.current_slice ?? "-"}`);
  console.log(`  tasks:           ${state.tasks.length}`);
  console.log(`  slices:          ${state.slices.length}`);
  console.log(`  violations:      ${state.violations.length}`);
}
