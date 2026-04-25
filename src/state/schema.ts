import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);

export const AdapterSchema = z.enum([
  "claude",
  "cursor",
  "codex",
  "windsurf",
  "cline",
  "kilo",
  "antigravity",
  "generic",
]);

export const ModeSchema = z.enum(["quick", "standard", "deep"]);

export const WorkflowSchema = z.enum(["phased", "planner"]);
export const PlannerModeSchema = z.enum(["manual", "autoplan"]);
export const PlannerStateSchema = z.enum([
  "idle",
  "planning",
  "awaiting_approval",
  "approved",
  "executing",
]);
export const ApprovalStatusSchema = z.enum([
  "none",
  "pending",
  "approved",
  "rejected",
]);

export const PhaseSchema = z.enum([
  "brief",
  "questions",
  "research",
  "design",
  "outline",
  "plan",
  "implement",
  "review",
  "ship",
  "learn",
]);

export const AtelierRcSchema = z.object({
  version: z.number().default(1),
  adapter: AdapterSchema.default("generic"),
  mode: ModeSchema.default("standard"),
});

export type AtelierRc = z.infer<typeof AtelierRcSchema>;

export const ReturnEntrySchema = z.object({
  from: PhaseSchema,
  to: PhaseSchema,
  reason: NonEmptyString,
  at: NonEmptyString,
});

export const WorkStatusSchema = z.enum([
  "draft",
  "researching",
  "blocked",
  "ready",
  "executing",
  "done",
  "cancelled",
]);

export const TaskTypeSchema = z.enum([
  "repo",
  "tech",
  "business",
  "synthesis",
  "implementation",
  "decision",
]);

export const SliceKindSchema = z.enum(["discovery", "delivery"]);

export const EpicSchema = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
  goal: NonEmptyString.optional(),
  summary: z.string().optional(),
  status: WorkStatusSchema.default("draft"),
  sprint_id: NonEmptyString.optional(),
  labels: z.array(NonEmptyString).default([]),
});

export const TaskSchema = z.object({
  id: NonEmptyString,
  epic_id: NonEmptyString,
  title: NonEmptyString,
  type: TaskTypeSchema,
  summary: z.string().optional(),
  status: WorkStatusSchema.default("draft"),
  depends_on: z.array(NonEmptyString).default([]),
  acceptance: z.array(NonEmptyString).default([]),
  open_questions: z.array(NonEmptyString).default([]),
  evidence_refs: z.array(NonEmptyString).default([]),
  slice_id: NonEmptyString.optional(),
  parallel_group: NonEmptyString.optional(),
});

export const SliceSchema = z.object({
  id: NonEmptyString,
  epic_id: NonEmptyString,
  title: NonEmptyString,
  goal: NonEmptyString,
  kind: SliceKindSchema.default("delivery"),
  summary: z.string().optional(),
  status: WorkStatusSchema.default("draft"),
  depends_on: z.array(NonEmptyString).default([]),
  source_task_ids: z.array(NonEmptyString).default([]),
  acceptance: z.array(NonEmptyString).default([]),
  risks: z.array(NonEmptyString).default([]),
});

export const ContextMetaSchema = z.object({
  atelier_context_version: z.literal(1).default(1),
  workflow: WorkflowSchema.default("phased"),
  planner_mode: PlannerModeSchema.default("manual"),
  planner_state: PlannerStateSchema.default("idle"),
  approval_status: ApprovalStatusSchema.default("none"),
  approval_reason: NonEmptyString.nullable().default(null),
  phase: PhaseSchema.default("brief"),
  mode: ModeSchema.optional(),
  adapter: AdapterSchema.optional(),
  gate_pending: NonEmptyString.nullable().optional(),
  current_epic: NonEmptyString.nullable().default(null),
  current_task: NonEmptyString.nullable().default(null),
  current_slice: NonEmptyString.nullable().default(null),
  epics: z.array(EpicSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  slices: z.array(SliceSchema).default([]),
  updated_at: NonEmptyString,
  returns: z.array(ReturnEntrySchema).default([]),
});

export type ContextMeta = z.infer<typeof ContextMetaSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type PlannerMode = z.infer<typeof PlannerModeSchema>;
export type PlannerState = z.infer<typeof PlannerStateSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type WorkStatus = z.infer<typeof WorkStatusSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type SliceKind = z.infer<typeof SliceKindSchema>;
export type Epic = z.infer<typeof EpicSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Slice = z.infer<typeof SliceSchema>;
