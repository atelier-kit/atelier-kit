export const ATELIER_MODES = ["quick", "standard", "deep"] as const;
export const ACTIVE_MODES = ["native", "atelier"] as const;
export const ATELIER_STATUSES = [
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
] as const;
export const APPROVAL_STATUSES = ["none", "pending", "approved", "rejected"] as const;
export const SLICE_STATUSES = ["draft", "ready", "in_progress", "done", "blocked", "needs-review"] as const;
export const TASK_TYPES = ["repo", "tech", "business", "synthesis", "decision", "implementation"] as const;

export type AtelierMode = (typeof ATELIER_MODES)[number];
export type ActiveMode = (typeof ACTIVE_MODES)[number];
export type AtelierStatus = (typeof ATELIER_STATUSES)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export type SliceStatus = (typeof SLICE_STATUSES)[number];
export type TaskType = (typeof TASK_TYPES)[number];

export interface AllowedActions {
  read_project_code: boolean;
  write_project_code: boolean;
  write_atelier_files: boolean;
  run_tests: boolean;
}

export interface ApprovalState {
  status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
}

export interface EpicTask {
  id: string;
  type: TaskType;
  status: "pending" | "ready" | "done" | "blocked";
  artifact: string;
}

export interface PlanSlice {
  id: string;
  title: string;
  status: SliceStatus;
  goal: string;
  depends_on: string[];
  allowed_files: string[];
  acceptance_criteria: string[];
  validation: string[];
}

export interface GuardConfig {
  baseline_ref: string;
  allowed_pre_execution_paths: string[];
}

export interface AtelierConfig {
  version: number;
  protocol: string;
  default_agent_mode: "native";
  default_atelier_mode: "standard" | "quick" | "deep";
  adapter: string;
  rules: {
    activation: "explicit";
    core_max_tokens: number;
    skills_load_strategy: "on_demand";
  };
  guards: {
    detect_pre_approval_code_changes: boolean;
    use_git_diff: boolean;
  };
}

export interface ActiveState {
  active: boolean;
  mode: ActiveMode;
  active_epic: string | null;
  active_phase: AtelierStatus | null;
  active_skill: string | null;
  updated_at: string | null;
}

export interface EpicState {
  version: number;
  epic_id: string;
  title: string;
  goal: string;
  mode: AtelierMode;
  status: AtelierStatus;
  active_skill: string | null;
  current_slice: string | null;
  approval: ApprovalState;
  allowed_actions: AllowedActions;
  required_artifacts: string[];
  tasks: EpicTask[];
  slices: PlanSlice[];
  guards: GuardConfig;
  violations: string[];
}
