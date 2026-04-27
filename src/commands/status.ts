import pc from "picocolors";
import { readActiveEpic, readAtelierConfig } from "../protocol/state.js";

export async function cmdStatus(cwd: string): Promise<void> {
  try {
    const config = await readAtelierConfig(cwd);
    const { active, state } = await readActiveEpic(cwd);
    console.log(pc.bold("Atelier-Kit"));
    console.log(`  protocol:      ${config.protocol}`);
    console.log(`  active:        ${active.active ? pc.green("true") : pc.dim("false")}`);
    console.log(`  mode:          ${active.mode}`);
    console.log(`  default mode:  ${config.default_atelier_mode}`);
    console.log(`  adapter:       ${config.adapter}`);
    console.log(`  active_epic:   ${active.active_epic ?? "—"}`);
    console.log(`  active_phase:  ${active.active_phase ?? "—"}`);
    console.log(`  active_skill:  ${active.active_skill ?? "—"}`);
    console.log(`  updated_at:    ${active.updated_at ?? "—"}`);
    if (!state) {
      console.log(pc.dim("\nAtelier is inactive. Native /plan remains unchanged."));
      return;
    }
    console.log(pc.bold("\nEpic"));
    console.log(`  title:         ${state.title}`);
    console.log(`  status:        ${state.status}`);
    console.log(`  approval:      ${state.approval.status}`);
    console.log(`  current_slice: ${state.current_slice ?? "—"}`);
    console.log(`  can_write:     ${state.allowed_actions.write_project_code}`);
    console.log(`  slices:        ${state.slices.length}`);
    console.log(`  violations:    ${state.violations.length}`);
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
