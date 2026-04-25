import pc from "picocolors";
import { readContext } from "../state/context.js";
import { readAtelierRc } from "../state/atelierrc.js";

export async function cmdStatus(cwd: string): Promise<void> {
  const { meta, body } = await readContext(cwd);
  let rc;
  try {
    rc = await readAtelierRc(cwd);
  } catch {
    rc = null;
  }

  console.log(pc.bold("Session"));
  console.log(`  workflow:       ${pc.cyan(meta.workflow)}`);
  console.log(`  planner_mode:   ${meta.planner_mode}`);
  console.log(`  planner_state:  ${meta.planner_state}`);
  console.log(`  approval:       ${meta.approval_status}`);
  console.log(`  phase_lens:     ${pc.cyan(meta.phase)}`);
  console.log(`  gate_pending:   ${meta.gate_pending ?? "—"}`);
  console.log(`  current_epic:   ${meta.current_epic ?? "—"}`);
  console.log(`  current_task:   ${meta.current_task ?? "—"}`);
  console.log(`  current_slice:  ${meta.current_slice ?? "—"}`);
  console.log(`  updated_at:     ${meta.updated_at}`);
  if (rc) {
    console.log(`  adapter (.atelierrc): ${rc.adapter}`);
    console.log(`  mode:                  ${rc.mode}`);
  }
  console.log(`  epics:           ${meta.epics.length}`);
  console.log(`  tasks:           ${meta.tasks.length}`);
  console.log(`  slices:          ${meta.slices.length}`);
  console.log(`  returns:         ${meta.returns.length}`);
  if (meta.epics.length) {
    console.log(pc.bold("\nEpics"));
    for (const epic of meta.epics) {
      console.log(
        pc.dim(
          `  - ${epic.id} [${epic.status}] ${epic.title}`,
        ),
      );
    }
  }
  if (meta.tasks.length) {
    console.log(pc.bold("\nTasks"));
    for (const task of meta.tasks.slice(0, 10)) {
      const deps = task.depends_on.length ? ` deps:${task.depends_on.join(",")}` : "";
      const slice = task.slice_id ? ` slice:${task.slice_id}` : "";
      console.log(
        pc.dim(
          `  - ${task.id} [${task.status}] (${task.type}) ${task.title}${deps}${slice}`,
        ),
      );
    }
    if (meta.tasks.length > 10) {
      console.log(pc.dim(`  ... ${meta.tasks.length - 10} more task(s)`));
    }
  }
  if (meta.slices.length) {
    console.log(pc.bold("\nSlices"));
    for (const slice of meta.slices) {
      const sources = slice.source_task_ids.length
        ? ` from:${slice.source_task_ids.join(",")}`
        : "";
      console.log(
        pc.dim(
          `  - ${slice.id} [${slice.status}] (${slice.kind}) ${slice.title}${sources}`,
        ),
      );
    }
  }
  if (meta.returns.length) {
    for (const r of meta.returns) {
      console.log(pc.dim(`    - ${r.from} → ${r.to}: ${r.reason}`));
    }
  }
  if (body) {
    console.log(pc.bold("\nNotes"));
    console.log(body);
  }
}
