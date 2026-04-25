import pc from "picocolors";
import { readContext } from "../state/context.js";
import { readPlanArtifactContent } from "../state/plan-artifacts.js";
import {
  WorkStatusSchema,
  WorkflowSchema,
  TaskTypeSchema,
  SliceKindSchema,
  type Epic,
  type Slice,
  type Task,
} from "../state/schema.js";
import {
  addEpic,
  addSlice,
  addTask,
  advancePlanner,
  approvePlan,
  autoplanGoal,
  focusEpic,
  focusSlice,
  focusTask,
  generatePlannerSlices,
  markCurrentDone,
  presentPlan,
  rejectPlan,
  executePlan,
  setWorkflow,
  startPlannerGoal,
  summarizePlannerCounts,
  syncPlannerPhase,
  updateEpic,
  updateSlice,
  updateTask,
  validatePlannerReadiness,
} from "../state/planner.js";
import { refreshFallbackAdapters } from "../adapters/index.js";

type CommonPatchOptions = {
  title?: string;
  summary?: string;
  status?: string;
};

function splitList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[|,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeStatus(status?: string) {
  if (status == null) return undefined;
  const parsed = WorkStatusSchema.safeParse(status);
  if (!parsed.success) {
    throw new Error(`Invalid status: ${status}`);
  }
  return parsed.data;
}

function normalizeWorkflow(workflow: string) {
  const parsed = WorkflowSchema.safeParse(workflow);
  if (!parsed.success) {
    throw new Error(`Invalid workflow: ${workflow}`);
  }
  return parsed.data;
}

function normalizeTaskType(type: string) {
  const parsed = TaskTypeSchema.safeParse(type);
  if (!parsed.success) {
    throw new Error(`Invalid task type: ${type}`);
  }
  return parsed.data;
}

function normalizeSliceKind(kind?: string) {
  if (!kind) return undefined;
  const parsed = SliceKindSchema.safeParse(kind);
  if (!parsed.success) {
    throw new Error(`Invalid slice kind: ${kind}`);
  }
  return parsed.data;
}

export async function cmdWorkflow(cwd: string, workflow: string): Promise<void> {
  try {
    const normalized = normalizeWorkflow(workflow);
    const meta = await setWorkflow(cwd, normalized);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Workflow set to ${normalized} (${summarizePlannerCounts(meta)})`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerStart(cwd: string, goal: string): Promise<void> {
  try {
    const meta = await startPlannerGoal(cwd, goal);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Planner started for "${goal}" (${summarizePlannerCounts(meta)})`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerAutoplan(cwd: string, goal: string): Promise<void> {
  try {
    const meta = await autoplanGoal(cwd, goal);
    await refreshFallbackAdapters(cwd);
    const blocked = meta.tasks.some((task) => task.status === "blocked");
    const label = blocked || meta.approval_status !== "pending"
      ? "Planner autoplan stopped"
      : "Planner autoplan complete";
    console.log(
      (blocked ? pc.yellow : pc.green)(
        `${label} for "${goal}" (${summarizePlannerCounts(meta)}) approval=${meta.approval_status}`,
      ),
    );
    if (meta.gate_pending) {
      console.log(pc.yellow(`Gate pending: ${meta.gate_pending}`));
    }
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerNext(cwd: string): Promise<void> {
  try {
    const meta = await advancePlanner(cwd);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Planner advanced (${summarizePlannerCounts(meta)}) focus task=${meta.current_task ?? "—"} slice=${meta.current_slice ?? "—"}`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerPresent(cwd: string): Promise<void> {
  try {
    const meta = await presentPlan(cwd);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Planner presented (${summarizePlannerCounts(meta)}) approval=${meta.approval_status}`,
      ),
    );
    {
      const { meta } = await readContext(cwd);
      console.log(await readPlanArtifactContent(cwd, meta));
    }
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerApprove(cwd: string): Promise<void> {
  try {
    const meta = await approvePlan(cwd);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Planner approved (${summarizePlannerCounts(meta)}) state=${meta.planner_state}`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerReject(cwd: string, reason: string): Promise<void> {
  try {
    const meta = await rejectPlan(cwd, reason);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Planner rejected (${summarizePlannerCounts(meta)}) approval=${meta.approval_status}`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerExecute(cwd: string): Promise<void> {
  try {
    const meta = await executePlan(cwd);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Planner execution started (${summarizePlannerCounts(meta)}) slice=${meta.current_slice ?? "—"}`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerDone(cwd: string): Promise<void> {
  try {
    const meta = await markCurrentDone(cwd);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Marked current planner focus done (${summarizePlannerCounts(meta)}) next task=${meta.current_task ?? "—"} slice=${meta.current_slice ?? "—"}`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerGenerateSlices(cwd: string): Promise<void> {
  try {
    const meta = await generatePlannerSlices(cwd);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Generated planner slices (${summarizePlannerCounts(meta)})`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerSyncPhase(cwd: string): Promise<void> {
  try {
    const meta = await syncPlannerPhase(cwd);
    await refreshFallbackAdapters(cwd);
    console.log(
      pc.green(
        `Planner phase synced to ${meta.phase} (${summarizePlannerCounts(meta)})`,
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdPlannerValidate(
  cwd: string,
  opts: { repair?: boolean } = {},
): Promise<void> {
  try {
    const report = await validatePlannerReadiness(cwd, { repair: opts.repair });
    if (report.repaired) {
      await refreshFallbackAdapters(cwd);
      console.log(pc.green("Planner state repaired from existing artifacts."));
    }
    console.log(report.ready ? pc.green("Planner readiness: ready") : pc.yellow("Planner readiness: blocked"));
    if (report.blocks.length > 0) {
      console.log("");
      console.log(pc.red("Blockers"));
      for (const block of report.blocks) {
        console.log(`- ${block}`);
      }
    }
    if (report.warnings.length > 0) {
      console.log("");
      console.log(pc.yellow("Warnings"));
      for (const warning of report.warnings) {
        console.log(`- ${warning}`);
      }
    }
    console.log("");
    console.log("Next actions");
    for (const action of report.next_actions) {
      console.log(`- ${action}`);
    }
    if (!report.ready) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdEpicAdd(
  cwd: string,
  id: string,
  opts: {
    title: string;
    goal?: string;
    summary?: string;
    status?: string;
    sprint?: string;
    labels?: string;
  },
): Promise<void> {
  try {
    const epic: Epic = {
      id,
      title: opts.title,
      goal: opts.goal,
      summary: opts.summary,
      status: normalizeStatus(opts.status) ?? "draft",
      sprint_id: opts.sprint,
      labels: splitList(opts.labels),
    };
    const meta = await addEpic(cwd, epic);
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Epic added: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdEpicUpdate(
  cwd: string,
  id: string,
  opts: CommonPatchOptions & {
    goal?: string;
    sprint?: string;
    labels?: string;
  },
): Promise<void> {
  try {
    const meta = await updateEpic(cwd, id, {
      title: opts.title,
      goal: opts.goal,
      summary: opts.summary,
      status: normalizeStatus(opts.status),
      sprint_id: opts.sprint,
      labels: opts.labels ? splitList(opts.labels) : undefined,
    });
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Epic updated: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdEpicFocus(cwd: string, id: string): Promise<void> {
  try {
    const meta = await focusEpic(cwd, id);
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Epic focused: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdTaskAdd(
  cwd: string,
  id: string,
  opts: {
    epic: string;
    title: string;
    type: string;
    summary?: string;
    status?: string;
    dependsOn?: string;
    acceptance?: string;
    openQuestions?: string;
    evidenceRefs?: string;
    slice?: string;
  },
): Promise<void> {
  try {
    const task: Task = {
      id,
      epic_id: opts.epic,
      title: opts.title,
      type: normalizeTaskType(opts.type),
      summary: opts.summary,
      status: normalizeStatus(opts.status) ?? "draft",
      depends_on: splitList(opts.dependsOn),
      acceptance: splitList(opts.acceptance),
      open_questions: splitList(opts.openQuestions),
      evidence_refs: splitList(opts.evidenceRefs),
      slice_id: opts.slice,
    };
    const meta = await addTask(cwd, task);
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Task added: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdTaskUpdate(
  cwd: string,
  id: string,
  opts: CommonPatchOptions & {
    type?: string;
    epic?: string;
    dependsOn?: string;
    acceptance?: string;
    openQuestions?: string;
    evidenceRefs?: string;
    slice?: string;
  },
): Promise<void> {
  try {
    const meta = await updateTask(cwd, id, {
      epic_id: opts.epic,
      title: opts.title,
      type: opts.type ? normalizeTaskType(opts.type) : undefined,
      summary: opts.summary,
      status: normalizeStatus(opts.status),
      depends_on: opts.dependsOn ? splitList(opts.dependsOn) : undefined,
      acceptance: opts.acceptance ? splitList(opts.acceptance) : undefined,
      open_questions: opts.openQuestions ? splitList(opts.openQuestions) : undefined,
      evidence_refs: opts.evidenceRefs ? splitList(opts.evidenceRefs) : undefined,
      slice_id: opts.slice,
    });
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Task updated: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdTaskFocus(cwd: string, id: string): Promise<void> {
  try {
    const meta = await focusTask(cwd, id);
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Task focused: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdSliceAdd(
  cwd: string,
  id: string,
  opts: {
    epic: string;
    title: string;
    goal: string;
    kind?: string;
    summary?: string;
    status?: string;
    dependsOn?: string;
    sourceTasks?: string;
    acceptance?: string;
    risks?: string;
  },
): Promise<void> {
  try {
    const slice: Slice = {
      id,
      epic_id: opts.epic,
      title: opts.title,
      goal: opts.goal,
      kind: normalizeSliceKind(opts.kind) ?? "delivery",
      summary: opts.summary,
      status: normalizeStatus(opts.status) ?? "draft",
      depends_on: splitList(opts.dependsOn),
      source_task_ids: splitList(opts.sourceTasks),
      acceptance: splitList(opts.acceptance),
      risks: splitList(opts.risks),
    };
    const meta = await addSlice(cwd, slice);
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Slice added: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdSliceUpdate(
  cwd: string,
  id: string,
  opts: CommonPatchOptions & {
    epic?: string;
    goal?: string;
    kind?: string;
    dependsOn?: string;
    sourceTasks?: string;
    acceptance?: string;
    risks?: string;
  },
): Promise<void> {
  try {
    const meta = await updateSlice(cwd, id, {
      epic_id: opts.epic,
      title: opts.title,
      goal: opts.goal,
      kind: normalizeSliceKind(opts.kind),
      summary: opts.summary,
      status: normalizeStatus(opts.status),
      depends_on: opts.dependsOn ? splitList(opts.dependsOn) : undefined,
      source_task_ids: opts.sourceTasks ? splitList(opts.sourceTasks) : undefined,
      acceptance: opts.acceptance ? splitList(opts.acceptance) : undefined,
      risks: opts.risks ? splitList(opts.risks) : undefined,
    });
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Slice updated: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdSliceFocus(cwd: string, id: string): Promise<void> {
  try {
    const meta = await focusSlice(cwd, id);
    await refreshFallbackAdapters(cwd);
    console.log(pc.green(`Slice focused: ${id} (${summarizePlannerCounts(meta)})`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
