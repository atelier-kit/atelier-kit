import pc from "picocolors";
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
  focusEpic,
  focusSlice,
  focusTask,
  setWorkflow,
  summarizePlannerCounts,
  updateEpic,
  updateSlice,
  updateTask,
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
