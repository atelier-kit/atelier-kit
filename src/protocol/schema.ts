import { z } from "zod";

export const AtelierModeSchema = z.enum(["quick", "standard", "deep"]);
export const AtelierAdapterSchema = z.enum([
  "cursor",
  "claude-code",
  "codex",
  "cline",
  "windsurf",
  "generic",
]);

export const AtelierStatusSchema = z.enum([
  "native",
  "idle",
  "discovery",
  "synthesis",
  "design",
  "planning",
  "awaiting_approval",
  "approved",
  "execution",
  "review",
  "done",
  "blocked",
  "paused",
]);

export const ApprovalStatusSchema = z.enum(["none", "pending", "approved", "rejected"]);

export const AtelierConfigSchema = z.object({
  version: z.literal(2),
  protocol: z.literal("atelier-planning-protocol"),
  default_agent_mode: z.literal("native"),
  default_atelier_mode: AtelierModeSchema,
  adapter: AtelierAdapterSchema,
  rules: z.object({
    activation: z.literal("explicit"),
    core_max_tokens: z.number(),
    skills_load_strategy: z.literal("on_demand"),
  }),
  guards: z.object({
    detect_pre_approval_code_changes: z.boolean(),
    use_git_diff: z.boolean(),
  }),
});

export const ActiveStateSchema = z.object({
  active: z.boolean(),
  mode: z.enum(["native", "atelier"]),
  active_epic: z.string().nullable(),
  active_phase: z.string().nullable(),
  active_skill: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const ApprovalInfoSchema = z.object({
  status: ApprovalStatusSchema,
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  notes: z.string().nullable(),
});

export const AllowedActionsSchema = z.object({
  read_project_code: z.boolean(),
  write_project_code: z.boolean(),
  write_atelier_files: z.boolean(),
  run_tests: z.boolean(),
});

export const SliceTaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(["pending", "in_progress", "done", "blocked", "needs-review"]),
  artifact: z.string(),
});

export const SliceSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["ready", "in_progress", "done", "blocked", "needs-review"]),
  goal: z.string(),
  depends_on: z.array(z.string()).default([]),
  allowed_files: z.array(z.string()).default([]),
  acceptance_criteria: z.array(z.string()).default([]),
  validation: z.array(z.string()).default([]),
});

export const GuardsSchema = z.object({
  baseline_ref: z.string(),
  allowed_pre_execution_paths: z.array(z.string()),
});

export const ViolationSchema = z.object({
  type: z.string(),
  message: z.string(),
  at: z.string(),
});

export const EpicStateSchema = z.object({
  version: z.literal(2),
  epic_id: z.string(),
  title: z.string(),
  goal: z.string(),
  mode: AtelierModeSchema,
  status: AtelierStatusSchema,
  active_skill: z.string().nullable(),
  current_slice: z.string().nullable(),
  approval: ApprovalInfoSchema,
  allowed_actions: AllowedActionsSchema,
  required_artifacts: z.array(z.string()),
  tasks: z.array(SliceTaskSchema),
  slices: z.array(SliceSchema),
  guards: GuardsSchema,
  violations: z.array(ViolationSchema),
});

export type AtelierConfig = z.infer<typeof AtelierConfigSchema>;
export type ActiveState = z.infer<typeof ActiveStateSchema>;
export type EpicState = z.infer<typeof EpicStateSchema>;
export type AtelierStatus = z.infer<typeof AtelierStatusSchema>;
export type AtelierMode = z.infer<typeof AtelierModeSchema>;
export type AtelierAdapter = z.infer<typeof AtelierAdapterSchema>;
export type ApprovalInfo = z.infer<typeof ApprovalInfoSchema>;
export type AllowedActions = z.infer<typeof AllowedActionsSchema>;
export type Slice = z.infer<typeof SliceSchema>;
export type SliceTask = z.infer<typeof SliceTaskSchema>;
export type Violation = z.infer<typeof ViolationSchema>;
