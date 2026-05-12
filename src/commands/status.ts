import pc from "picocolors";
import { readActiveEpic, readAtelierConfig } from "../protocol/state.js";

export async function cmdStatus(cwd: string, opts: { inject?: boolean } = {}): Promise<void> {
  if (opts.inject) {
    await cmdStatusInject(cwd);
    return;
  }

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
      console.log(pc.dim("\nAtelier is inactive. `/plan ...` stays host-native unless a native-plan hook activates V2."));
      return;
    }
    console.log(pc.bold("\nEpic"));
    console.log(`  title:         ${state.title}`);
    console.log(`  status:        ${state.status}`);
    console.log(`  slices:        ${state.slices.length}`);
    console.log(`  violations:    ${state.violations.length}`);
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

async function cmdStatusInject(cwd: string): Promise<void> {
  try {
    const { active, state } = await readActiveEpic(cwd);
    if (!active.active || !state) {
      process.stdout.write("[atelier-kit]\nactive: false\n");
      return;
    }
    const activeTask =
      state.tasks.find((t) => t.status === "in_progress") ??
      state.tasks.find((t) => t.status === "pending") ??
      null;
    const lines = [
      "[atelier-kit]",
      `active: true`,
      `epic: ${state.epic_id} | phase: ${state.status}`,
    ];
    if (state.active_skill) {
      lines.push(`active_skill: ${state.active_skill}`);
      lines.push(`skill_file: .atelier/skills/${state.active_skill}.md`);
    }
    if (activeTask) {
      lines.push(`artifact: .atelier/epics/${state.epic_id}/${activeTask.artifact}`);
    }
    process.stdout.write(`${lines.join("\n")}\n`);
  } catch {
    process.stdout.write("[atelier-kit]\nactive: false\n");
  }
}
