import pc from "picocolors";
import { readAtelierConfig, readActiveState, readEpicState } from "../../protocol/io.js";

export async function cmdV2Status(cwd: string): Promise<void> {
  let config;
  try {
    config = await readAtelierConfig(cwd);
  } catch {
    console.log(pc.yellow("No atelier.json found. Run `atelier init` first."));
    return;
  }

  let active;
  try {
    active = await readActiveState(cwd);
  } catch {
    console.log(pc.yellow("No active.json found. Run `atelier init` first."));
    return;
  }

  console.log(pc.bold("Atelier-Kit v2 Status"));
  console.log(pc.dim("─".repeat(40)));
  console.log(`  protocol:      ${pc.cyan(config.protocol)} v${config.version}`);
  console.log(`  adapter:       ${config.adapter}`);
  console.log(`  default mode:  ${config.default_atelier_mode}`);
  console.log("");
  console.log(pc.bold("Activation"));
  if (active.active) {
    console.log(`  active:        ${pc.green("yes")}`);
    console.log(`  mode:          ${pc.cyan(active.mode)}`);
    console.log(`  epic:          ${pc.cyan(active.active_epic ?? "—")}`);
    console.log(`  phase:         ${active.active_phase ?? "—"}`);
    console.log(`  skill:         ${active.active_skill ?? "—"}`);
    console.log(`  updated_at:    ${active.updated_at ?? "—"}`);
  } else {
    console.log(`  active:        ${pc.dim("no (native mode)")}`);
  }

  if (active.active && active.active_epic) {
    console.log("");
    console.log(pc.bold("Epic State"));
    try {
      const epicState = await readEpicState(cwd, active.active_epic);
      console.log(`  epic_id:       ${pc.cyan(epicState.epic_id)}`);
      console.log(`  title:         ${epicState.title}`);
      console.log(`  mode:          ${epicState.mode}`);
      console.log(`  status:        ${pc.cyan(epicState.status)}`);
      console.log(`  approval:      ${epicState.approval.status}`);
      console.log(`  skill:         ${epicState.active_skill ?? "—"}`);
      console.log(`  current_slice: ${epicState.current_slice ?? "—"}`);
      console.log(`  write_code:    ${epicState.allowed_actions.write_project_code ? pc.green("yes") : pc.red("no")}`);
      console.log(`  violations:    ${epicState.violations.length}`);
      if (epicState.slices.length > 0) {
        console.log("");
        console.log(pc.bold("  Slices"));
        for (const slice of epicState.slices) {
          const current = epicState.current_slice === slice.id ? pc.yellow(" ◀ current") : "";
          console.log(
            pc.dim(`    [${slice.status}] ${slice.id}: ${slice.title}${current}`),
          );
        }
      }
    } catch {
      console.log(pc.yellow(`  Could not read state for epic '${active.active_epic}'`));
    }
  }
}
