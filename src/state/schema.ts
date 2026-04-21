import { z } from "zod";

export const AdapterSchema = z.enum([
  "claude",
  "cursor",
  "codex",
  "windsurf",
  "generic",
]);

export const ModeSchema = z.enum(["quick", "standard", "deep"]);

export const WorkflowSchema = z.enum(["phased", "planner"]);

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
  reason: z.string(),
  at: z.string(),
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
  id: z.string(),
  title: z.string(),
  goal: z.string().optional(),
  summary: z.string().optional(),
  status: WorkStatusSchema.default("draft"),
  sprint_id: z.string().optional(),
  labels: z.array(z.string()).default([]),
});

export const TaskSchema = z.object({
  id: z.string(),
  epic_id: z.string(),
  title: z.string(),
  type: TaskTypeSchema,
  summary: z.string().optional(),
  status: WorkStatusSchema.default("draft"),
  depends_on: z.array(z.string()).default([]),
  acceptance: z.array(z.string()).default([]),
  open_questions: z.array(z.string()).default([]),
  evidence_refs: z.array(z.string()).default([]),
  slice_id: z.string().optional(),
});

export const SliceSchema = z.object({
  id: z.string(),
  epic_id: z.string(),
  title: z.string(),
  goal: z.string(),
  kind: SliceKindSchema.default("delivery"),
  summary: z.string().optional(),
  status: WorkStatusSchema.default("draft"),
  depends_on: z.array(z.string()).default([]),
  source_task_ids: z.array(z.string()).default([]),
  acceptance: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
});

export const ContextMetaSchema = z.object({
  atelier_context_version: z.literal(1).default(1),
  workflow: WorkflowSchema.default("phased"),
  phase: PhaseSchema.default("brief"),
  mode: ModeSchema.optional(),
  adapter: AdapterSchema.optional(),
  gate_pending: z.string().nullable().optional(),
  current_epic: z.string().nullable().default(null),
  current_task: z.string().nullable().default(null),
  current_slice: z.string().nullable().default(null),
  epics: z.array(EpicSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  slices: z.array(SliceSchema).default([]),
  updated_at: z.string(),
  returns: z.array(ReturnEntrySchema).default([]),
});

export type ContextMeta = z.infer<typeof ContextMetaSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkStatus = z.infer<typeof WorkStatusSchema>;
export type TaskType = z.infer<typeof TaskTypeSchema>;
export type SliceKind = z.infer<typeof SliceKindSchema>;
export type Epic = z.infer<typeof EpicSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Slice = z.infer<typeof SliceSchema>;
