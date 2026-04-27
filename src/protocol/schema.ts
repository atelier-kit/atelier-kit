import { z } from "zod";
import {
  ACTIVE_MODES,
  APPROVAL_STATUSES,
  ATELIER_MODES,
  ATELIER_STATUSES,
  SLICE_STATUSES,
  TASK_TYPES,
} from "./types.js";

export const AtelierModeSchema = z.enum(ATELIER_MODES);
export const ActiveModeSchema = z.enum(ACTIVE_MODES);
export const AtelierStatusSchema = z.enum(ATELIER_STATUSES);
export const ApprovalStatusSchema = z.enum(APPROVAL_STATUSES);
export const SliceStatusSchema = z.enum(SLICE_STATUSES);
export const TaskTypeSchema = z.enum(TASK_TYPES);

export const AllowedActionsSchema = z.object({
  read_project_code: z.boolean(),
  write_project_code: z.boolean(),
  write_atelier_files: z.boolean(),
  run_tests: z.boolean(),
});

export const ApprovalStateSchema = z.object({
  status: ApprovalStatusSchema,
  approved_by: z.string().nullable(),
  approved_at: z.string().nullable(),
  notes: z.string().nullable(),
});

export const EpicTaskSchema = z.object({
  id: z.string().min(1),
  type: TaskTypeSchema,
  status: z.enum(["pending", "ready", "done", "blocked"]),
  artifact: z.string().min(1),
});

export const PlanSliceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: SliceStatusSchema,
  goal: z.string().min(1),
  depends_on: z.array(z.string()).default([]),
  allowed_files: z.array(z.string()).default([]),
  acceptance_criteria: z.array(z.string()).default([]),
  validation: z.array(z.string()).default([]),
});

export const GuardConfigSchema = z.object({
  baseline_ref: z.string().min(1),
  allowed_pre_execution_paths: z.array(z.string().min(1)).default([".atelier/**"]),
});

export const AtelierConfigSchema = z.object({
  version: z.literal(2),
  protocol: z.literal("atelier-planning-protocol"),
  default_agent_mode: z.literal("native"),
  default_atelier_mode: AtelierModeSchema,
  adapter: z.string().min(1),
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

export const ActiveStateSchema = z.object({
  active: z.boolean(),
  mode: ActiveModeSchema,
  active_epic: z.string().nullable(),
  active_phase: AtelierStatusSchema.nullable(),
  active_skill: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const EpicStateSchema = z.object({
  version: z.literal(2),
  epic_id: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  mode: AtelierModeSchema,
  status: AtelierStatusSchema,
  active_skill: z.string().nullable(),
  current_slice: z.string().nullable(),
  approval: ApprovalStateSchema,
  allowed_actions: AllowedActionsSchema,
  required_artifacts: z.array(z.string().min(1)),
  tasks: z.array(EpicTaskSchema),
  slices: z.array(PlanSliceSchema),
  guards: GuardConfigSchema,
  violations: z.array(z.string()),
});

export type AtelierConfig = z.infer<typeof AtelierConfigSchema>;
export type ActiveState = z.infer<typeof ActiveStateSchema>;
export type EpicState = z.infer<typeof EpicStateSchema>;
export type PlanSlice = z.infer<typeof PlanSliceSchema>;
export type EpicTask = z.infer<typeof EpicTaskSchema>;
