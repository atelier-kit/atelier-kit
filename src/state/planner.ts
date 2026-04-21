import {
  readContext,
  writeContext,
} from "./context.js";
import type {
  ContextMeta,
  Epic,
  Slice,
  Task,
  WorkStatus,
  Workflow,
} from "./schema.js";

type PlannerEntity = Epic | Task | Slice;

function requireId<T extends PlannerEntity>(
  items: T[],
  id: string,
  label: string,
): T {
  const item = items.find((entry) => entry.id === id);
  if (!item) {
    throw new Error(`${label} not found: ${id}`);
  }
  return item;
}

function ensureUniqueId<T extends PlannerEntity>(
  items: T[],
  id: string,
  label: string,
): void {
  if (items.some((entry) => entry.id === id)) {
    throw new Error(`${label} already exists: ${id}`);
  }
}

function mergeById<T extends PlannerEntity>(
  items: T[],
  id: string,
  patch: Partial<T>,
  label: string,
): T[] {
  let found = false;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    found = true;
    return { ...item, ...patch };
  });
  if (!found) {
    throw new Error(`${label} not found: ${id}`);
  }
  return next;
}

function validateTaskLinks(meta: ContextMeta, task: Task): void {
  requireId(meta.epics, task.epic_id, "Epic");
  for (const dep of task.depends_on) {
    requireId(meta.tasks, dep, "Task dependency");
  }
  if (task.slice_id) {
    const slice = requireId(meta.slices, task.slice_id, "Slice");
    if (slice.epic_id !== task.epic_id) {
      throw new Error(
        `Task ${task.id} points to slice ${slice.id} from a different epic`,
      );
    }
  }
}

function validateSliceLinks(meta: ContextMeta, slice: Slice): void {
  requireId(meta.epics, slice.epic_id, "Epic");
  for (const dep of slice.depends_on) {
    if (!meta.tasks.some((task) => task.id === dep) && !meta.slices.some((item) => item.id === dep)) {
      throw new Error(`Slice dependency not found: ${dep}`);
    }
  }
  for (const taskId of slice.source_task_ids) {
    const task = requireId(meta.tasks, taskId, "Source task");
    if (task.epic_id !== slice.epic_id) {
      throw new Error(
        `Slice ${slice.id} references task ${task.id} from a different epic`,
      );
    }
  }
}

async function mutatePlannerState(
  cwd: string,
  mutate: (meta: ContextMeta) => ContextMeta,
): Promise<ContextMeta> {
  const { meta, body } = await readContext(cwd);
  const next = mutate(meta);
  await writeContext(cwd, next, body);
  return next;
}

export async function setWorkflow(
  cwd: string,
  workflow: Workflow,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => ({ ...meta, workflow }));
}

export async function addEpic(
  cwd: string,
  epic: Epic,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    ensureUniqueId(meta.epics, epic.id, "Epic");
    return {
      ...meta,
      workflow: "planner",
      current_epic: meta.current_epic ?? epic.id,
      epics: [...meta.epics, epic],
    };
  });
}

export async function updateEpic(
  cwd: string,
  id: string,
  patch: Partial<Epic>,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => ({
    ...meta,
    epics: mergeById(meta.epics, id, patch, "Epic"),
  }));
}

export async function focusEpic(
  cwd: string,
  id: string,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    requireId(meta.epics, id, "Epic");
    const firstTask = meta.tasks.find((task) => task.epic_id === id);
    const firstSlice = meta.slices.find((slice) => slice.epic_id === id);
    return {
      ...meta,
      workflow: "planner",
      current_epic: id,
      current_task: firstTask?.id ?? meta.current_task,
      current_slice: firstSlice?.id ?? meta.current_slice,
    };
  });
}

export async function addTask(
  cwd: string,
  task: Task,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    ensureUniqueId(meta.tasks, task.id, "Task");
    validateTaskLinks(meta, task);
    return {
      ...meta,
      workflow: "planner",
      current_epic: meta.current_epic ?? task.epic_id,
      current_task: meta.current_task ?? task.id,
      tasks: [...meta.tasks, task],
    };
  });
}

export async function updateTask(
  cwd: string,
  id: string,
  patch: Partial<Task>,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const current = requireId(meta.tasks, id, "Task");
    const nextTask = { ...current, ...patch };
    validateTaskLinks(meta, nextTask);
    return {
      ...meta,
      tasks: meta.tasks.map((task) => (task.id === id ? nextTask : task)),
    };
  });
}

export async function focusTask(
  cwd: string,
  id: string,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const task = requireId(meta.tasks, id, "Task");
    return {
      ...meta,
      workflow: "planner",
      current_epic: task.epic_id,
      current_task: task.id,
      current_slice: task.slice_id ?? meta.current_slice,
    };
  });
}

export async function addSlice(
  cwd: string,
  slice: Slice,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    ensureUniqueId(meta.slices, slice.id, "Slice");
    validateSliceLinks(meta, slice);
    return {
      ...meta,
      workflow: "planner",
      current_epic: meta.current_epic ?? slice.epic_id,
      current_slice: meta.current_slice ?? slice.id,
      slices: [...meta.slices, slice],
    };
  });
}

export async function updateSlice(
  cwd: string,
  id: string,
  patch: Partial<Slice>,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const current = requireId(meta.slices, id, "Slice");
    const nextSlice = { ...current, ...patch };
    validateSliceLinks(meta, nextSlice);
    return {
      ...meta,
      slices: meta.slices.map((slice) => (slice.id === id ? nextSlice : slice)),
    };
  });
}

export async function focusSlice(
  cwd: string,
  id: string,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const slice = requireId(meta.slices, id, "Slice");
    return {
      ...meta,
      workflow: "planner",
      current_epic: slice.epic_id,
      current_slice: slice.id,
    };
  });
}

export function summarizePlannerCounts(meta: ContextMeta): string {
  return `epics=${meta.epics.length} tasks=${meta.tasks.length} slices=${meta.slices.length}`;
}

export function normalizeWorkStatus(status?: WorkStatus): WorkStatus | undefined {
  return status;
}
