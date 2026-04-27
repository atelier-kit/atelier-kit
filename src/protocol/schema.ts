import { z } from "zod";

const NonEmptyString = z.string().trim().min(1);

export const AdapterSchema = z.enum([
  "cursor",
  "claude-code",
  "claude",
  "codex",
  "cline",
  "windsurf",
  "kilo",
  "antigravity",
  "generic",
]);

export const AtelierModeSchema = z.enum(["native", "quick", "standard", "deep"]);
export const ProtocolModeSchema = z.enum(["native", "atelier"]);

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

export const ApprovalStatusSchema = z.enum([
  "none",
  "pending",
  "approved",
  "rejected",
]);

export const SkillSchema = z.enum([
  "repo-analyst",
  "tech-analyst",
  "business-analyst",
  "planner",
  "designer",
  "implementer",
  "reviewer",
]);

export const TaskTypeSchema = z.enum([
  "repo",
  "tech",
  "business",
  "synthesis",
  "design",
  "planning",
  "implementation",
  "review",
]);

export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "done",
  "blocked",
]);

export const SliceStatusSchema = z.enum([
  "draft",
  "ready",
  "executing",
  "done",
  "blocked",
  "needs-review",
]);

export const AtelierConfigSchema = z.object({
  version: z.literal(2),
  protocol: z.literal("atelier-planning-protocol"),
  default_agent_mode: z.literal("native").default("native"),
  default_atelier_mode: z.enum(["quick", "standard", "deep"]).default("standard"),
  adapter: AdapterSchema.default("generic"),
  rules: z.object({
    activation: z.literal("explicit").default("explicit"),
    core_max_tokens: z.number().int().positive().default(1200),
    skills_load_strategy: z.literal("on_demand").default("on_demand"),
  }),
  guards: z.object({
    detect_pre_approval_code_changes: z.boolean().default(true),
    use_git_diff: z.boolean().default(true),
  }),
});

export const ActiveStateSchema = z.object({
  active: z.boolean(),
  mode: ProtocolModeSchema,
  active_epic: NonEmptyString.nullable(),
  active_phase: AtelierStatusSchema.nullable(),
  active_skill: SkillSchema.nullable(),
  updated_at: NonEmptyString.nullable(),
});

export const ApprovalSchema = z.object({
  status: ApprovalStatusSchema,
  approved_by: NonEmptyString.nullable(),
  approved_at: NonEmptyString.nullable(),
  notes: z.string().nullable(),
});

export const AllowedActionsSchema = z.object({
  read_project_code: z.boolean(),
  write_project_code: z.boolean(),
  write_atelier_files: z.boolean(),
  run_tests: z.boolean(),
});

export const ProtocolTaskSchema = z.object({
  id: NonEmptyString,
  type: TaskTypeSchema,
  status: TaskStatusSchema,
  artifact: NonEmptyString,
});

export const SliceSchema = z.object({
  id: NonEmptyString,
  title: NonEmptyString,
  status: SliceStatusSchema,
  goal: NonEmptyString,
  depends_on: z.array(NonEmptyString).default([]),
  allowed_files: z.array(NonEmptyString),
  acceptance_criteria: z.array(NonEmptyString),
  validation: z.array(NonEmptyString),
});

export const GuardsSchema = z.object({
  baseline_ref: NonEmptyString.default("HEAD"),
  allowed_pre_execution_paths: z.array(NonEmptyString).default([".atelier/**"]),
});

export const EpicStateSchema = z.object({
  version: z.literal(2),
  epic_id: NonEmptyString,
  title: NonEmptyString,
  goal: NonEmptyString,
  mode: z.enum(["quick", "standard", "deep"]),
  status: AtelierStatusSchema,
  active_skill: SkillSchema.nullable(),
  current_slice: NonEmptyString.nullable(),
  approval: ApprovalSchema,
  allowed_actions: AllowedActionsSchema,
  required_artifacts: z.array(NonEmptyString),
  tasks: z.array(ProtocolTaskSchema),
  slices: z.array(SliceSchema),
  guards: GuardsSchema,
  violations: z.array(z.string()),
});

export type AdapterName = z.infer<typeof AdapterSchema>;
export type AtelierMode = z.infer<typeof AtelierModeSchema>;
export type ProtocolMode = z.infer<typeof ProtocolModeSchema>;
export type AtelierStatus = z.infer<typeof AtelierStatusSchema>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;
export type SkillName = z.infer<typeof SkillSchema>;
export type AtelierConfig = z.infer<typeof AtelierConfigSchema>;
export type ActiveState = z.infer<typeof ActiveStateSchema>;
export type EpicState = z.infer<typeof EpicStateSchema>;
export type ProtocolSlice = z.infer<typeof SliceSchema>;
