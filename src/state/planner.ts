import {
  defaultContextRepository,
} from "./context.js";
import { allocateUniquePlanId, slugifyGoal, writePlanBundle } from "./plan-artifacts.js";
import { DependencyGraph } from "../domain/dependency-graph.js";
import { validatePlannerTechnicalResearchGate } from "../gates/research.js";
import type {
  ApprovalStatus,
  ContextMeta,
  Epic,
  Phase,
  PlannerState,
  Slice,
  Task,
  WorkStatus,
  Workflow,
} from "./schema.js";
import { defaultGoalClassifier } from "./task-templates.js";
import type { IContextRepository } from "../ports/context-repository.js";
import type { IGoalClassifier } from "../ports/goal-classifier.js";

export interface PlannerPorts {
  repo?: IContextRepository;
  classifier?: IGoalClassifier;
}

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
    const dependency = requireId(meta.tasks, dep, "Task dependency");
    if (dependency.epic_id !== task.epic_id) {
      throw new Error(
        `Task ${task.id} depends on task ${dependency.id} from a different epic`,
      );
    }
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
    const task = meta.tasks.find((candidate) => candidate.id === dep);
    const priorSlice = meta.slices.find((item) => item.id === dep);
    if (!task && !priorSlice) {
      throw new Error(`Slice dependency not found: ${dep}`);
    }
    if (task && task.epic_id !== slice.epic_id) {
      throw new Error(
        `Slice ${slice.id} depends on task ${task.id} from a different epic`,
      );
    }
    if (priorSlice && priorSlice.epic_id !== slice.epic_id) {
      throw new Error(
        `Slice ${slice.id} depends on slice ${priorSlice.id} from a different epic`,
      );
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

function assertAcyclicTasks(tasks: Task[]): void {
  const graph = DependencyGraph.fromEntries(tasks);
  if (graph.hasCycle()) {
    throw new Error("Task dependencies contain a cycle");
  }
}

function assertAcyclicSlices(slices: Slice[]): void {
  const graph = DependencyGraph.fromEntries(slices);
  if (graph.hasCycle()) {
    throw new Error("Slice dependencies contain a cycle");
  }
}

async function mutatePlannerState(
  cwd: string,
  mutate: (meta: ContextMeta) => ContextMeta,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  const { meta, body } = await repo.read(cwd);
  const next = mutate(meta);
  await repo.write(cwd, next, body);
  return next;
}

async function syncPlannerPhaseInline(
  cwd: string,
  meta: ContextMeta,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  const next = syncPhase(meta);
  if (next.phase === meta.phase) {
    return meta;
  }
  const { body } = await repo.read(cwd);
  await repo.write(cwd, next, body);
  return next;
}

export async function setWorkflow(
  cwd: string,
  workflow: Workflow,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => ({
    ...meta,
    workflow,
    planner_state: workflow === "planner" ? meta.planner_state : "idle",
    approval_status: workflow === "planner" ? meta.approval_status : "none",
  }), repo);
}

function syncPhase(meta: ContextMeta): ContextMeta {
  let phase: Phase = meta.phase;
  if (meta.workflow !== "planner") {
    return meta;
  }
  if (meta.planner_state === "awaiting_approval") {
    return { ...meta, phase: "plan" };
  }
  const currentTask = meta.current_task
    ? meta.tasks.find((task) => task.id === meta.current_task)
    : null;
  if (meta.current_slice && meta.planner_state === "executing") {
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
  const activeStatuses: WorkStatus[] = ["researching", "ready", "executing", "draft"];
  const candidates = meta.tasks.filter(
    (task) =>
      task.status !== "done" &&
      task.status !== "cancelled" &&
      (!meta.current_epic || task.epic_id === meta.current_epic),
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
    (slice) =>
      slice.status !== "done" &&
      slice.status !== "cancelled" &&
      (!meta.current_epic || slice.epic_id === meta.current_epic) &&
      (meta.planner_state === "executing"
        ? slice.status === "ready" || slice.status === "executing"
        : slice.status === "ready"),
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
    const sliceId = `${slugifyGoal(seed)}-slice-1`;
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
  if (nextMeta.planner_state === "awaiting_approval") {
    return syncPhase({
      ...nextMeta,
      current_task: null,
      current_slice: null,
    });
  }
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

export async function syncPlannerPhase(
  cwd: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => syncPhase(meta), repo);
}

export async function generatePlannerSlices(
  cwd: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => syncFocus(generateSlicesForSynthesis(meta)), repo);
}

export async function startPlannerGoal(
  cwd: string,
  goal: string,
  ports: PlannerPorts = {},
): Promise<ContextMeta> {
  const classifier = ports.classifier ?? defaultGoalClassifier;
  const repo = ports.repo ?? defaultContextRepository;
  const { meta: beforeMeta } = await repo.read(cwd);
  const epicId =
    repo === defaultContextRepository
      ? await allocateUniquePlanId(cwd, goal, beforeMeta.epics)
      : (() => {
          const used = new Set(beforeMeta.epics.map((e) => e.id));
          const base = slugifyGoal(goal);
          let id = base;
          let n = 2;
          while (used.has(id)) {
            id = `${base}-${n++}`;
          }
          return id;
        })();
  return mutatePlannerState(cwd, (meta) => {
    if (meta.epics.some((epic) => epic.id === epicId)) {
      throw new Error(`Epic already exists: ${epicId}`);
    }
    const epic: Epic = {
      id: epicId,
      title: goal,
      goal,
      summary: "Planner-generated epic from goal entrypoint.",
      status: "researching",
      labels: ["planner"],
    };
    const discoveryGroup = `${epicId}-discovery`;
    const templates = classifier.getTemplates(goal);
    const discoveryIds = templates
      .filter((t) => t.type !== "synthesis")
      .map((t) => `${epicId}-${t.suffix}`);
    const tasks: Task[] = templates.map((tpl) => {
      const isSynthesis = tpl.type === "synthesis";
      const isRepo = tpl.type === "repo";
      const base: Task = {
        id: `${epicId}-${tpl.suffix}`,
        epic_id: epicId,
        title: tpl.title,
        type: tpl.type,
        summary: tpl.summary,
        status: isRepo ? "researching" : isSynthesis ? "draft" : "ready",
        depends_on: isSynthesis ? discoveryIds : [],
        acceptance: tpl.acceptance,
        open_questions: tpl.open_questions,
        evidence_refs: [],
      };
      return isSynthesis ? base : { ...base, parallel_group: discoveryGroup };
    });
    const nextMeta: ContextMeta = {
      ...meta,
      workflow: "planner",
      phase: "plan",
      planner_state: "planning",
      approval_status: "none",
      current_epic: epicId,
      current_task: `${epicId}-repo`,
      current_slice: null,
      epics: [...meta.epics, epic],
      tasks: [...meta.tasks, ...tasks],
    };
    return syncFocus(nextMeta);
  }, repo);
}

export async function markCurrentDone(
  cwd: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    let nextMeta = meta;
    if (meta.current_slice) {
      if (meta.planner_state !== "executing") {
        throw new Error("Cannot complete a slice before planner execution is approved");
      }
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
      nextMeta = transitionToAwaitingApproval(nextMeta);
    } else {
      throw new Error("No current task or slice is focused");
    }
    return syncFocus(nextMeta);
  }, repo);
}

export async function advancePlanner(
  cwd: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => syncFocus(generateSlicesForSynthesis(meta)), repo);
}

function transitionToAwaitingApproval(meta: ContextMeta): ContextMeta {
  const relevantTasks = meta.current_epic
    ? meta.tasks.filter((task) => task.epic_id === meta.current_epic)
    : meta.tasks;
  const relevantSlices = meta.current_epic
    ? meta.slices.filter((slice) => slice.epic_id === meta.current_epic)
    : meta.slices;

  const synthesisDone = relevantTasks.some(
    (task) => task.type === "synthesis" && task.status === "done",
  );
  if (!synthesisDone || relevantSlices.length === 0) {
    return meta;
  }
  return {
    ...meta,
    planner_state: "awaiting_approval",
    approval_status: "pending",
    current_task: null,
    current_slice: null,
  };
}

function nextApprovalStatus(state: PlannerState): ApprovalStatus {
  return state === "awaiting_approval" ? "pending" : "none";
}

function renderPlan(meta: ContextMeta): string {
  const epic = meta.current_epic
    ? meta.epics.find((entry) => entry.id === meta.current_epic)
    : meta.epics[0];
  const relevantTasks = epic
    ? meta.tasks.filter((task) => task.epic_id === epic.id)
    : meta.tasks;
  const relevantSlices = epic
    ? meta.slices.filter((slice) => slice.epic_id === epic.id)
    : meta.slices;

  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    "# Plan",
    "",
    `> Generated: ${now} · Tasks: ${relevantTasks.length} · Slices: ${relevantSlices.length} · State: ${meta.planner_state} · Approval: ${meta.approval_status}`,
    "",
    epic
      ? `## Epic: ${epic.title}${epic.goal && epic.goal !== epic.title ? `\n\n> ${epic.goal}` : ""}`
      : "## Epic\n\n_No epic selected_",
    "",
    "## Discovery tracks",
    "",
  ];

  if (relevantTasks.length === 0) {
    lines.push("_No tasks_");
  } else {
    const groups = new Map<string, typeof relevantTasks>();
    const ungrouped: typeof relevantTasks = [];
    for (const task of relevantTasks) {
      if (task.parallel_group) {
        const g = groups.get(task.parallel_group) ?? [];
        g.push(task);
        groups.set(task.parallel_group, g);
      } else {
        ungrouped.push(task);
      }
    }
    for (const [groupId, groupTasks] of groups) {
      lines.push(`**Parallel track: ${groupId}**`);
      lines.push("");
      for (const task of groupTasks) {
        lines.push(`- [${task.status}] (${task.type}) ${task.title}`);
        for (const item of task.acceptance) {
          lines.push(`  - acceptance: ${item}`);
        }
      }
      lines.push("");
    }
    for (const task of ungrouped) {
      const deps = task.depends_on.length
        ? ` (depends on: ${task.depends_on.join(", ")})`
        : "";
      lines.push(`- [${task.status}] (${task.type}) ${task.title}${deps}`);
      for (const item of task.acceptance) {
        lines.push(`  - acceptance: ${item}`);
      }
    }
  }

  lines.push("", "## Proposed slices", "");
  if (relevantSlices.length === 0) {
    lines.push("_No slices yet_");
  } else {
    for (const slice of relevantSlices) {
      const deps = slice.depends_on.length
        ? ` (depends on: ${slice.depends_on.join(", ")})`
        : "";
      lines.push(`### ${slice.title}`);
      lines.push(
        `- Status: ${slice.status}${deps}`,
        `- Goal: ${slice.goal}`,
      );
      if (slice.acceptance.length) {
        lines.push("- Acceptance:");
        for (const item of slice.acceptance) {
          lines.push(`  - ${item}`);
        }
      }
      if (slice.risks.length) {
        lines.push("- Risks:");
        for (const risk of slice.risks) {
          lines.push(`  - ${risk}`);
        }
      }
      lines.push("");
    }
  }

  const slicesWithDeps = relevantSlices.filter((s) => s.depends_on.length > 0);
  if (slicesWithDeps.length > 0) {
    lines.push("## Dependency map", "");
    for (const slice of slicesWithDeps) {
      for (const dep of slice.depends_on) {
        lines.push(`- ${dep} → ${slice.id}`);
      }
    }
    lines.push("");
  }

  const allRisks = relevantSlices.flatMap((s) =>
    s.risks.map((r) => ({ risk: r, sliceId: s.id })),
  );
  if (allRisks.length > 0) {
    lines.push("## Risk register", "");
    for (const { risk, sliceId } of allRisks) {
      lines.push(`- ${risk} _(${sliceId})_`);
    }
    lines.push("");
  }

  const repoTasks = relevantTasks.filter((t) => t.type === "repo");
  const techTasks = relevantTasks.filter((t) => t.type === "tech");
  const businessTasks = relevantTasks.filter((t) => t.type === "business");
  const evidenceStatus = (tasks: typeof relevantTasks, fallback: string): string => {
    if (tasks.length === 0) return "not applicable";
    if (tasks.some((t) => t.status === "blocked")) return "blocked";
    if (tasks.every((t) => t.evidence_refs.length > 0)) return "verified";
    if (tasks.every((t) => t.status === "done")) return fallback;
    return "pending";
  };
  const unverifiedTasks = relevantTasks.filter(
    (t) => t.type === "tech" && t.status === "done" && t.evidence_refs.length === 0,
  );
  lines.push(
    "## Evidence status",
    "",
    `- Repo facts: ${evidenceStatus(repoTasks, "inferred")}`,
    `- Technical sources: ${evidenceStatus(techTasks, "unverified")}`,
    `- Business assumptions: ${evidenceStatus(businessTasks, "pending")}`,
  );
  if (unverifiedTasks.length > 0) {
    lines.push(
      `- Unverified assumptions: ${unverifiedTasks.map((t) => t.id).join(", ")}`,
    );
  }
  lines.push("");

  const openQs = relevantTasks.flatMap((t) =>
    t.open_questions
      .filter((q) => q.trim() !== "")
      .map((q) => ({ question: q, taskId: t.id, resolved: t.evidence_refs.length > 0 })),
  );
  if (openQs.length > 0) {
    lines.push("## Open questions", "");
    for (const { question, taskId, resolved } of openQs) {
      const mark = resolved ? "~~" : "";
      lines.push(`- ${mark}${question}${mark} _(${taskId})_`);
    }
    lines.push("");
  }

  lines.push(
    "## Human review",
    "",
    meta.approval_status === "pending"
      ? "- [ ] Approve plan"
      : meta.approval_status === "approved"
        ? "- [x] Plan approved"
        : meta.approval_status === "rejected"
          ? `- [ ] Plan rejected${meta.approval_reason ? ` — ${meta.approval_reason}` : ""}; revise before execution`
          : "- [ ] Approval not required yet",
  );

  if (meta.approval_reason && meta.approval_status === "rejected") {
    lines.push("", `> Rejection reason: ${meta.approval_reason}`);
  }

  return `${lines.join("\n").trim()}\n`;
}

export async function writePlannerPlanArtifact(
  cwd: string,
  meta?: ContextMeta,
  repo: IContextRepository = defaultContextRepository,
): Promise<void> {
  if (repo !== defaultContextRepository) {
    return;
  }
  const currentMeta = meta ?? (await repo.read(cwd)).meta;
  await writePlanBundle(cwd, currentMeta, renderPlan(currentMeta));
}

export async function presentPlannerPlan(
  cwd: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  const meta = await mutatePlannerState(cwd, (current) => {
    const next = transitionToAwaitingApproval(current);
    if (next.slices.length === 0) {
      throw new Error("Cannot present a planner plan before slices exist");
    }
    return {
      ...next,
      planner_state: "awaiting_approval",
      approval_status: "pending",
      approval_reason: null,
      current_task: null,
      current_slice: null,
    };
  }, repo);
  if (repo === defaultContextRepository) {
    await writePlannerPlanArtifact(cwd, meta, repo);
  }
  return meta;
}

interface PlanValidationResult {
  warnings: string[];
  blocks: string[];
}

export function validatePlanBeforeApproval(meta: ContextMeta): PlanValidationResult {
  const warnings: string[] = [];
  const blocks: string[] = [];

  const epicId = meta.current_epic;
  const relevantTasks = epicId
    ? meta.tasks.filter((t) => t.epic_id === epicId)
    : meta.tasks;
  const relevantSlices = epicId
    ? meta.slices.filter((s) => s.epic_id === epicId)
    : meta.slices;

  const synthesisDone = relevantTasks.some(
    (t) => t.type === "synthesis" && t.status === "done",
  );
  if (!synthesisDone) {
    blocks.push("Synthesis task is not done — discovery has not converged.");
  }

  const discoveryPending = relevantTasks.filter(
    (t) =>
      (t.type === "repo" || t.type === "tech" || t.type === "business") &&
      t.status !== "done" &&
      t.status !== "cancelled",
  );
  if (discoveryPending.length > 0) {
    const ids = discoveryPending.map((t) => t.id).join(", ");
    warnings.push(`Discovery tasks are not done: ${ids}`);
  }

  if (relevantSlices.length === 0) {
    blocks.push("No slices exist — synthesis must produce at least one slice before approval.");
  }

  const slicesWithoutAcceptance = relevantSlices.filter((s) => s.acceptance.length === 0);
  if (slicesWithoutAcceptance.length > 0) {
    const ids = slicesWithoutAcceptance.map((s) => s.id).join(", ");
    warnings.push(`Slices have no acceptance criteria: ${ids}`);
  }

  const slicesWithoutGoal = relevantSlices.filter((s) => !s.goal || s.goal.trim() === "");
  if (slicesWithoutGoal.length > 0) {
    const ids = slicesWithoutGoal.map((s) => s.id).join(", ");
    blocks.push(`Slices are missing a goal: ${ids}`);
  }

  const tasksWithOpenQuestions = relevantTasks.filter(
    (t) => t.open_questions.length > 0 && t.evidence_refs.length === 0 && t.status !== "done",
  );
  if (tasksWithOpenQuestions.length > 0) {
    const ids = tasksWithOpenQuestions.map((t) => t.id).join(", ");
    warnings.push(`Tasks have open questions without evidence: ${ids}`);
  }

  const unverifiedDoneTechTasks = relevantTasks.filter(
    (t) => t.type === "tech" && t.status === "done" && t.evidence_refs.length === 0,
  );
  if (unverifiedDoneTechTasks.length > 0) {
    const ids = unverifiedDoneTechTasks.map((t) => t.id).join(", ");
    blocks.push(`Technical research tasks are done without evidence refs: ${ids}`);
  }

  const blockedTechTasks = relevantTasks.filter(
    (t) => t.type === "tech" && t.status === "blocked",
  );
  if (blockedTechTasks.length > 0) {
    const ids = blockedTechTasks.map((t) => t.id).join(", ");
    blocks.push(`Technical research is blocked: ${ids}`);
  }

  return { warnings, blocks };
}

export async function approvePlannerPlan(
  cwd: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  const { meta: current } = await repo.read(cwd);
  if (current.planner_state !== "awaiting_approval") {
    throw new Error("Planner is not awaiting approval");
  }
  const { warnings, blocks } = validatePlanBeforeApproval(current);
  if (blocks.length > 0) {
    throw new Error(
      `Plan approval blocked:\n${blocks.map((b) => `  - ${b}`).join("\n")}`,
    );
  }
  if (warnings.length > 0) {
    for (const w of warnings) {
      process.stderr.write(`[planner warn] ${w}\n`);
    }
  }
  const meta = await mutatePlannerState(cwd, (state) => ({
    ...state,
    planner_state: "approved" as const,
    approval_status: "approved" as const,
    approval_reason: null,
  }), repo);
  if (repo === defaultContextRepository) {
    await writePlannerPlanArtifact(cwd, meta, repo);
  }
  return meta;
}

export async function rejectPlannerPlan(
  cwd: string,
  reason: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (current) => ({
    ...current,
    planner_state: "planning",
    approval_status: "rejected",
    approval_reason: reason,
    gate_pending: reason,
    current_task: current.tasks.find((task) => task.type === "synthesis")?.id ?? current.current_task,
    current_slice: null,
  }), repo);
}

export async function executeApprovedPlan(
  cwd: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (current) => {
    if (current.approval_status !== "approved") {
      throw new Error("Cannot execute planner before approval");
    }
    const epicId = current.current_epic;
    const executableSlices: Slice[] = current.slices.map((slice) =>
      slice.status === "ready" && (!epicId || slice.epic_id === epicId)
        ? { ...slice, status: "executing" }
        : slice,
    );
    const firstSlice = executableSlices.find(
      (slice) => slice.status === "executing" && (!epicId || slice.epic_id === epicId),
    );
    return syncPhase({
      ...current,
      planner_state: "executing",
      current_task: null,
      current_slice: firstSlice?.id ?? null,
      slices: executableSlices,
      gate_pending: null,
    });
  }, repo);
}

export const presentPlan = presentPlannerPlan;
export const approvePlan = approvePlannerPlan;
export const rejectPlan = rejectPlannerPlan;
export const executePlan = executeApprovedPlan;
export const approvePlannerExecution = approvePlannerPlan;
export const rejectPlannerExecution = rejectPlannerPlan;

export async function autoplanGoal(
  cwd: string,
  goal: string,
  ports: PlannerPorts = {},
): Promise<ContextMeta> {
  const repo = ports.repo ?? defaultContextRepository;
  let meta = await startPlannerGoal(cwd, goal, ports);
  while (meta.current_task) {
    const currentTask = meta.tasks.find((task) => task.id === meta.current_task);
    if (currentTask?.type === "tech" && currentTask.evidence_refs.length === 0) {
      const evidence = repo === defaultContextRepository
        ? await validatePlannerTechnicalResearchGate(cwd, meta)
        : { ok: true, errors: [] };
      if (!evidence.ok) {
        meta = await blockCurrentTask(cwd, evidence.errors.join("; "), repo);
        return meta;
      }
      if (repo === defaultContextRepository) {
        meta = await addCurrentTaskEvidenceRef(
          cwd,
          ".atelier/artifacts/research.md#stage-2-external-technical-research-tech",
          repo,
        );
      }
    }
    meta = await markCurrentDone(cwd, repo);
  }
  const blocked = meta.tasks.some(
    (task) => (!meta.current_epic || task.epic_id === meta.current_epic) && task.status === "blocked",
  );
  if (!blocked && meta.slices.length > 0) {
    meta = await presentPlannerPlan(cwd, repo);
  }
  return meta;
}

export async function addEpic(
  cwd: string,
  epic: Epic,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    ensureUniqueId(meta.epics, epic.id, "Epic");
    return {
      ...meta,
      workflow: "planner",
      planner_state: meta.planner_state === "idle" ? "planning" : meta.planner_state,
      approval_status: nextApprovalStatus(meta.planner_state),
      current_epic: meta.current_epic ?? epic.id,
      epics: [...meta.epics, epic],
    };
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export async function updateEpic(
  cwd: string,
  id: string,
  patch: Partial<Epic>,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => ({
    ...meta,
    epics: mergeById(meta.epics, id, patch, "Epic"),
  }), repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export async function focusEpic(
  cwd: string,
  id: string,
  repo: IContextRepository = defaultContextRepository,
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
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export async function addTask(
  cwd: string,
  task: Task,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    ensureUniqueId(meta.tasks, task.id, "Task");
    validateTaskLinks(meta, task);
    const tasks = [...meta.tasks, task];
    assertAcyclicTasks(tasks);
    return {
      ...meta,
      workflow: "planner",
      planner_state: meta.planner_state === "idle" ? "planning" : meta.planner_state,
      approval_status: nextApprovalStatus(meta.planner_state),
      current_epic: meta.current_epic ?? task.epic_id,
      current_task: meta.current_task ?? task.id,
      tasks,
    };
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export async function updateTask(
  cwd: string,
  id: string,
  patch: Partial<Task>,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const current = requireId(meta.tasks, id, "Task");
    const nextTask = { ...current, ...patch };
    validateTaskLinks(meta, nextTask);
    const tasks = meta.tasks.map((task) => (task.id === id ? nextTask : task));
    assertAcyclicTasks(tasks);
    return {
      ...meta,
      tasks,
    };
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

async function blockCurrentTask(
  cwd: string,
  reason: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    if (!meta.current_task) return meta;
    return syncFocus({
      ...meta,
      gate_pending: reason,
      tasks: meta.tasks.map((task) =>
        task.id === meta.current_task ? { ...task, status: "blocked" } : task
      ),
    });
  }, repo);
}

async function addCurrentTaskEvidenceRef(
  cwd: string,
  evidenceRef: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    if (!meta.current_task) return meta;
    return {
      ...meta,
      tasks: meta.tasks.map((task) =>
        task.id === meta.current_task
          ? { ...task, evidence_refs: [...new Set([...task.evidence_refs, evidenceRef])] }
          : task
      ),
    };
  }, repo);
}

export async function focusTask(
  cwd: string,
  id: string,
  repo: IContextRepository = defaultContextRepository,
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
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export async function addSlice(
  cwd: string,
  slice: Slice,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    ensureUniqueId(meta.slices, slice.id, "Slice");
    validateSliceLinks(meta, slice);
    const slices = [...meta.slices, slice];
    assertAcyclicSlices(slices);
    return {
      ...meta,
      workflow: "planner",
      planner_state: meta.planner_state === "idle" ? "planning" : meta.planner_state,
      approval_status: nextApprovalStatus(meta.planner_state),
      current_epic: meta.current_epic ?? slice.epic_id,
      current_slice: meta.current_slice ?? slice.id,
      slices,
    };
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export async function updateSlice(
  cwd: string,
  id: string,
  patch: Partial<Slice>,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const current = requireId(meta.slices, id, "Slice");
    const nextSlice = { ...current, ...patch };
    validateSliceLinks(meta, nextSlice);
    const slices = meta.slices.map((slice) => (slice.id === id ? nextSlice : slice));
    assertAcyclicSlices(slices);
    return {
      ...meta,
      slices,
    };
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export async function focusSlice(
  cwd: string,
  id: string,
  repo: IContextRepository = defaultContextRepository,
): Promise<ContextMeta> {
  return mutatePlannerState(cwd, (meta) => {
    const slice = requireId(meta.slices, id, "Slice");
    return {
      ...meta,
      workflow: "planner",
      current_epic: slice.epic_id,
      current_slice: slice.id,
    };
  }, repo).then((meta) => syncPlannerPhaseInline(cwd, meta, repo));
}

export function summarizePlannerCounts(meta: ContextMeta): string {
  return `epics=${meta.epics.length} tasks=${meta.tasks.length} slices=${meta.slices.length}`;
}

export function normalizeWorkStatus(status?: WorkStatus): WorkStatus | undefined {
  return status;
}
