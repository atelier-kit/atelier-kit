import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readContext } from "../state/context.js";
import { atelierDir } from "../fs-utils.js";

export async function cmdHandoff(cwd: string): Promise<void> {
  const { meta, body } = await readContext(cwd);
  const base = atelierDir(cwd);
  const arts = [
    "questions.md",
    "research.md",
    "design.md",
    "outline.md",
    "plan.md",
    "impl-log.md",
    "review.md",
  ];
  console.log("# atelier-kit handoff\n");
  console.log("```yaml");
  console.log(JSON.stringify(meta, null, 2));
  console.log("```\n");
  if (meta.epics.length || meta.tasks.length || meta.slices.length) {
    console.log("## Planning state\n");
    console.log(
      `Planner state: ${meta.planner_state} | approval: ${meta.approval_status}\n`,
    );
    if (meta.current_epic || meta.current_task || meta.current_slice) {
      console.log(
        `Current focus: epic=${meta.current_epic ?? "—"}, task=${meta.current_task ?? "—"}, slice=${meta.current_slice ?? "—"}\n`,
      );
    }
    if (meta.epics.length) {
      console.log("### Epics\n");
      for (const epic of meta.epics) {
        console.log(`- [${epic.status}] ${epic.id}: ${epic.title}`);
      }
      console.log("");
    }
    if (meta.tasks.length) {
      console.log("### Tasks\n");
      for (const task of meta.tasks) {
        const deps = task.depends_on.length
          ? ` deps=${task.depends_on.join(",")}`
          : "";
        const slice = task.slice_id ? ` slice=${task.slice_id}` : "";
        console.log(
          `- [${task.status}] ${task.id} (${task.type}) epic=${task.epic_id}${slice}${deps}: ${task.title}`,
        );
      }
      console.log("");
    }
    if (meta.slices.length) {
      console.log("### Slices\n");
      for (const slice of meta.slices) {
        const deps = slice.depends_on.length
          ? ` deps=${slice.depends_on.join(",")}`
          : "";
        console.log(
          `- [${slice.status}] ${slice.id} (${slice.kind}) epic=${slice.epic_id}${deps}: ${slice.title}`,
        );
      }
      console.log("");
    }
  }
  if (body) {
    console.log("## Session notes\n\n", body, "\n");
  }
  for (const f of arts) {
    try {
      const t = await readFile(join(base, "artifacts", f), "utf8");
      console.log(`## ${f}\n\n`, t.slice(0, 2000), t.length > 2000 ? "\n…(truncated)\n" : "\n");
    } catch {
      // skip
    }
  }
}
