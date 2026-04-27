import type { ActiveJson, AtelierJson, AtelierMode, EpicState } from "./types.js";

export function defaultAtelierJson(adapter: AtelierJson["adapter"]): AtelierJson {
  return {
    version: 2,
    protocol: "atelier-planning-protocol",
    default_agent_mode: "native",
    default_atelier_mode: "standard",
    adapter,
    rules: {
      activation: "explicit",
      core_max_tokens: 1200,
      skills_load_strategy: "on_demand",
    },
    guards: {
      detect_pre_approval_code_changes: true,
      use_git_diff: true,
    },
  };
}

export function inactiveActiveJson(): ActiveJson {
  return {
    active: false,
    mode: "native",
    active_epic: null,
    active_phase: null,
    active_skill: null,
    updated_at: null,
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function requiredArtifactsForMode(mode: AtelierMode): string[] {
  switch (mode) {
    case "quick":
      return [
        "questions.md",
        "research/repo.md",
        "plan.md",
        "execution-log.md",
        "review.md",
      ];
    case "standard":
      return [
        "questions.md",
        "research/repo.md",
        "research/tech.md",
        "research/business.md",
        "synthesis.md",
        "decisions.md",
        "design.md",
        "plan.md",
        "execution-log.md",
        "review.md",
      ];
    case "deep":
      return [
        "questions.md",
        "research/repo.md",
        "research/tech.md",
        "research/business.md",
        "synthesis.md",
        "decisions.md",
        "design.md",
        "risk-register.md",
        "rollback.md",
        "test-strategy.md",
        "plan.md",
        "critique.md",
        "execution-log.md",
        "review.md",
      ];
    default:
      return [];
  }
}

export function initialEpicState(
  epicId: string,
  title: string,
  goal: string,
  mode: AtelierMode,
): EpicState {
  return {
    version: 2,
    epic_id: epicId,
    title,
    goal,
    mode,
    status: "discovery",
    active_skill: "repo-analyst",
    current_slice: null,
    approval: {
      status: "none",
      approved_by: null,
      approved_at: null,
      notes: null,
    },
    allowed_actions: {
      read_project_code: true,
      write_project_code: false,
      write_atelier_files: true,
      run_tests: false,
    },
    required_artifacts: requiredArtifactsForMode(mode),
    tasks: [],
    slices: [],
    guards: {
      baseline_ref: "HEAD",
      allowed_pre_execution_paths: [".atelier/**"],
    },
    violations: [],
  };
}
