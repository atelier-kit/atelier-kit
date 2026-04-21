import {
  readContext,
  writeContext,
} from "./context.js";
import type {
  ContextMeta,
  Epic,
  Phase,
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

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "planner-epic";
}

function syncPhase(meta: ContextMeta): ContextMeta {
  let phase: Phase = meta.phase;
  if (meta.workflow !== "planner") {
    return meta;
  }
  const currentTask = meta.current_task
    ? meta.tasks.find((task) => task.id === meta.current_task)
    : null;
  if (meta.current_slice) {
    phase = "implement";
  } else if (currentTask) {
    switch (currentTask.type) {
      case "decision":
        phase = "design";
        break;
      case "implementation":
        phase = "implement";
        break;
      default:
        phase = "plan";
        break;
    }
  } else if (meta.tasks.length > 0 || meta.slices.length > 0) {
    phase = meta.slices.length > 0 ? "implement" : "plan";
  }
  return { ...meta, phase };
}

function hasSliceForTask(meta: ContextMeta, taskId: string): boolean {
  return meta.slices.some((slice) => slice.source_task_ids.includes(taskId));
}

function taskPriority(task: Task): number {
  const priorities: Record<Task["type"], number> = {
    repo: 0,
    tech: 1,
    business: 2,
    decision: 3,
    synthesis: 4,
    implementation: 5,
  };
  return priorities[task.type];
}

function isTaskReady(meta: ContextMeta, task: Task): boolean {
  return task.depends_on.every((dep) =>
    meta.tasks.some((candidate) => candidate.id === dep && candidate.status === "done")
  );
}

function chooseNextTask(meta: ContextMeta): Task | null {
  const activeStatuses: WorkStatus[] = ["researching", "ready", "executing", "draft", "blocked"];
  const candidates = meta.tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
  const ordered = [...candidates].sort((a, b) => {
    const aReady = isTaskReady(meta, a) ? 0 : 1;
    const bReady = isTaskReady(meta, b) ? 0 : 1;
    return aReady - bReady || taskPriority(a) - taskPriority(b) || a.title.localeCompare(b.title);
  });
  const next = ordered.find((task) => isTaskReady(meta, task) && activeStatuses.includes(task.status));
  return next ?? null;
}

function chooseNextSlice(meta: ContextMeta): Slice | null {
  const candidates = meta.slices.filter(
    (slice) => slice.status !== "done" && slice.status !== "cancelled",
  );
  const next = candidates.find((slice) =>
    slice.depends_on.every((dep) => {
      const task = meta.tasks.find((candidate) => candidate.id === dep);
      if (task) return task.status === "done";
      const priorSlice = meta.slices.find((candidate) => candidate.id === dep);
      return priorSlice ? priorSlice.status === "done" : false;
    })
  );
  return next ?? null;
}

function generateSlicesForSynthesis(meta: ContextMeta): ContextMeta {
  const synthesisTasks = meta.tasks.filter((task) => task.type === "synthesis");
  let nextMeta = meta;
  for (const task of synthesisTasks) {
    if (task.status !== "done") continue;
    if (hasSliceForTask(nextMeta, task.id)) continue;
    const discoveryTasks = nextMeta.tasks.filter(
      (candidate) =>
        candidate.epic_id === task.epic_id &&
        (candidate.type === "repo" || candidate.type === "tech" || candidate.type === "business") &&
        candidate.status === "done",
    );
    const epic = nextMeta.epics.find((entry) => entry.id === task.epic_id);
    const seed = epic?.title ?? task.title;
    const sliceId = `${slugify(seed)}-slice-1`;
    if (nextMeta.slices.some((slice) => slice.id === sliceId)) continue;
    const slice: Slice = {
      id: sliceId,
      epic_id: task.epic_id,
      title: `Initial slice — ${seed}`,
      goal: `Ship the first end-to-end delivery slice for ${seed}`,
      kind: "delivery",
      summary: "Auto-generated from completed synthesis work.",
      status: "ready",
      depends_on: [task.id],
      source_task_ids: [
        ...new Set([task.id, ...discoveryTasks.map((candidate) => candidate.id)]),
      ],
      acceptance: [
        "End-to-end behavior is demonstrated for one vertical cut",
        "Relevant tests or validation commands are recorded",
      ],
      risks: ["Review assumptions from synthesis before expanding scope"],
    };
    nextMeta = {
      ...nextMeta,
      slices: [...nextMeta.slices, slice],
    };
    nextMeta = {
      ...nextMeta,
      tasks: nextMeta.tasks.map((candidate) =>
        candidate.id === task.id
          ? { ...candidate, slice_id: slice.id }
          : candidate
      ),
    };
  }
  return nextMeta;
}

function syncFocus(meta: ContextMeta): ContextMeta {
  let nextMeta = meta;
  const nextTask = chooseNextTask(nextMeta);
  const nextSlice = chooseNextSlice(nextMeta);

  if (nextSlice && !nextTask) {
    nextMeta = {
      ...nextMeta,
      current_epic: nextSlice.epic_id,
      current_task: null,
      current_slice: nextSlice.id,
    };
    return syncPhase(nextMeta);
  }

  if (nextTask) {
    nextMeta = {
      ...nextMeta,
      current_epic: nextTask.epic_id,
      current_task: nextTask.id,
      current_slice: nextTask.slice_id ?? null,
      tasks: nextMeta.tasks.map((candidate) =>
        candidate.id === nextTask.id && candidate.status === "draft"
          ? { ...candidate, status: "researching" }
          : candidate
      ),
    };
  } else if (nextSlice) {
    nextMeta = {
      ...nextMeta,
      current_epic: nextSlice.epic_id,
      current_task: null,
      current_slice: nextSlice.id,
    };
  } else {
    nextMeta = {
      ...nextMeta,
      current_task: null,
      current_slice: null,
    };
  }

  return syncPhase(nextMeta);
}

export async function syncPlannerPhase(cwd: string): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => syncPhase(meta));
}

export async function generatePlannerSlices(cwd: string): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => syncFocus(generateSlicesForSynthesis(meta)));
}

export async function startPlannerGoal(
  cwd: string,
  goal: string,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const epicId = slugify(goal);
    if (meta.epics.some((epic) => epic.id === epicId)) {
      throw new Error(`Epic already exists for goal: ${epicId}`);
    }
    const epic: Epic = {
      id: epicId,
      title: goal,
      goal,
      summary: "Planner-generated epic from goal entrypoint.",
      status: "researching",
      labels: ["planner"],
    };
    const tasks: Task[] = [
      {
        id: `${epicId}-repo`,
        epic_id: epicId,
        title: "Map repository facts and current implementation boundaries",
        type: "repo",
        summary: "Gather repository-local evidence for the goal.",
        status: "researching",
        depends_on: [],
        acceptance: ["Relevant modules and constraints are mapped"],
        open_questions: [],
        evidence_refs: [],
      },
      {
        id: `${epicId}-tech`,
        epic_id: epicId,
        title: "Research technical feasibility and platform constraints",
        type: "tech",
        summary: "Gather external technical evidence required by the goal.",
        status: "ready",
        depends_on: [],
        acceptance: ["Technical tradeoffs and constraints are documented"],
        open_questions: [],
        evidence_refs: [],
      },
      {
        id: `${epicId}-business`,
        epic_id: epicId,
        title: "Clarify business impact, rollout, and stakeholder concerns",
        type: "business",
        summary: "Capture business and delivery implications for the goal.",
        status: "ready",
        depends_on: [],
        acceptance: ["Business assumptions and rollout concerns are documented"],
        open_questions: [],
        evidence_refs: [],
      },
      {
        id: `${epicId}-synthesis`,
        epic_id: epicId,
        title: "Synthesize research into slices and execution order",
        type: "synthesis",
        summary: "Converge the planner tracks into executable delivery slices.",
        status: "draft",
        depends_on: [`${epicId}-repo`, `${epicId}-tech`, `${epicId}-business`],
        acceptance: ["Execution slices are proposed with dependencies and acceptance checks"],
        open_questions: [],
        evidence_refs: [],
      },
    ];
    const nextMeta: ContextMeta = {
      ...meta,
      workflow: "planner",
      phase: "plan",
      current_epic: epicId,
      current_task: `${epicId}-repo`,
      current_slice: null,
      epics: [...meta.epics, epic],
      tasks: [...meta.tasks, ...tasks],
    };
    return syncFocus(nextMeta);
  });
}

export async function markCurrentDone(cwd: string): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    let nextMeta = meta;
    if (meta.current_slice) {
      nextMeta = {
        ...meta,
        slices: meta.slices.map((slice) =>
          slice.id === meta.current_slice ? { ...slice, status: "done" } : slice
        ),
        current_slice: null,
      };
    } else if (meta.current_task) {
      nextMeta = {
        ...meta,
        tasks: meta.tasks.map((task) =>
          task.id === meta.current_task ? { ...task, status: "done" } : task
        ),
        current_task: null,
      };
      nextMeta = generateSlicesForSynthesis(nextMeta);
    } else {
      throw new Error("No current task or slice is focused");
    }
    return syncFocus(nextMeta);
  });
}

export async function advancePlanner(cwd: string): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => syncFocus(generateSlicesForSynthesis(meta)));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
}

export async function updateEpic(
  cwd: string,
  id: string,
  patch: Partial<Epic>,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => ({
    ...meta,
    epics: mergeById(meta.epics, id, patch, "Epic"),
  })).then((meta) => syncPlannerPhaseInline(cwd, meta));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
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
  }).then((meta) => syncPlannerPhaseInline(cwd, meta));
}

export function summarizePlannerCounts(meta: ContextMeta): string {
  return `epics=${meta.epics.length} tasks=${meta.tasks.length} slices=${meta.slices.length}`;
}

export function normalizeWorkStatus(status?: WorkStatus): WorkStatus | undefined {
  return status;
}

async function syncPlannerPhaseInline(
  cwd: string,
  meta: ContextMeta,
): Promise<ContextMeta> {
  const next = syncPhase(meta);
  if (next.phase === meta.phase) {
    return meta;
  }
  const { body } = await readContext(cwd);
  await writeContext(cwd, next, body);
  return next;
}
