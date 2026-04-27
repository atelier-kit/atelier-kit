import { z } from "zod";

export const AtelierModeSchema = z.enum(["quick", "standard", "deep"]);
export type AtelierMode = z.infer<typeof AtelierModeSchema>;

export const AtelierAdapterIdSchema = z.enum([
  "generic",
  "cursor",
  "claude-code",
  "codex",
  "cline",
  "windsurf",
]);
export type AtelierAdapterId = z.infer<typeof AtelierAdapterIdSchema>;

export const AtelierJsonSchema = z.object({
  version: z.literal(2),
  protocol: z.literal("atelier-planning-protocol"),
  default_agent_mode: z.literal("native"),
  default_atelier_mode: AtelierModeSchema,
  adapter: AtelierAdapterIdSchema,
  rules: z.object({
    activation: z.literal("explicit"),
    core_max_tokens: z.number().int().positive(),
    skills_load_strategy: z.literal("on_demand"),
  }),
  guards: z.object({
    detect_pre_approval_code_changes: z.boolean(),
    use_git_diff: z.boolean(),
  }),
});
export type AtelierJson = z.infer<typeof AtelierJsonSchema>;

export const ActiveJsonSchema = z.object({
  active: z.boolean(),
  mode: z.enum(["native", "atelier"]),
  active_epic: z.string().min(1).nullable(),
  active_phase: z.string().nullable(),
  active_skill: z.string().nullable(),
  updated_at: z.string().nullable(),
});
export type ActiveJson = z.infer<typeof ActiveJsonSchema>;

export const EpicApprovalSchema = z.object({
  status: z.enum(["none", "pending", "approved", "rejected"]),
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  notes: z.string().nullable(),
});

export const EpicAllowedActionsSchema = z.object({
  read_project_code: z.boolean(),
  write_project_code: z.boolean(),
  write_atelier_files: z.boolean(),
  run_tests: z.boolean(),
});

export const EpicStatusSchema = z.enum([
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
export type EpicStatus = z.infer<typeof EpicStatusSchema>;

export const SliceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum([
    "draft",
    "ready",
    "executing",
    "done",
    "blocked",
    "needs-review",
  ]),
  goal: z.string().min(1),
  depends_on: z.array(z.string()).default([]),
  allowed_files: z.array(z.string().min(1)).min(1),
  acceptance_criteria: z.array(z.string().min(1)).min(1),
  validation: z.array(z.string().min(1)).min(1),
});
export type Slice = z.infer<typeof SliceSchema>;

export const EpicStateSchema = z.object({
  version: z.literal(2),
  epic_id: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  mode: AtelierModeSchema,
  status: EpicStatusSchema,
  active_skill: z.string().nullable(),
  current_slice: SliceSchema.nullable(),
  approval: EpicApprovalSchema,
  allowed_actions: EpicAllowedActionsSchema,
  required_artifacts: z.array(z.string()),
  tasks: z.array(z.unknown()),
  slices: z.array(SliceSchema),
  guards: z.object({
    baseline_ref: z.string().min(1),
    allowed_pre_execution_paths: z.array(z.string()),
  }),
  violations: z.array(z.string()),
});
export type EpicState = z.infer<typeof EpicStateSchema>;
