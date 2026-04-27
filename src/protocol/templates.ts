import type { AdapterName } from "../adapters/types.js";
import type {
  ActiveState,
  AllowedActions,
  ApprovalState,
  AtelierConfig,
  AtelierMode,
  EpicState,
  EpicTask,
} from "./types.js";

export function nowIso(): string {
  return new Date().toISOString();
}

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "epic";
}

export function defaultAtelierConfig(adapter: AdapterName, mode: AtelierMode): AtelierConfig {
  return {
    version: 2,
    protocol: "atelier-planning-protocol",
    default_agent_mode: "native",
    default_atelier_mode: mode,
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

export function inactiveActiveState(): ActiveState {
  return {
    active: false,
    mode: "native",
    active_epic: null,
    active_phase: null,
    active_skill: null,
    updated_at: null,
  };
}

export function defaultApprovalState(): ApprovalState {
  return {
    status: "none",
    approved_by: null,
    approved_at: null,
    notes: null,
  };
}

export function allowedActionsForStatus(status: EpicState["status"]): AllowedActions {
  switch (status) {
    case "execution":
      return {
        read_project_code: true,
        write_project_code: true,
        write_atelier_files: true,
        run_tests: true,
      };
    case "review":
      return {
        read_project_code: true,
        write_project_code: false,
        write_atelier_files: true,
        run_tests: true,
      };
    default:
      return {
        read_project_code: true,
        write_project_code: false,
        write_atelier_files: true,
        run_tests: false,
      };
  }
}

export function requiredArtifactsForMode(mode: AtelierMode): string[] {
  if (mode === "quick") {
    return [
      "questions.md",
      "research/repo.md",
      "plan.md",
      "execution-log.md",
      "review.md",
    ];
  }
  if (mode === "standard") {
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
  }
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
}

export function discoveryTasksForMode(mode: AtelierMode): EpicTask[] {
  const tasks: EpicTask[] = [
    { id: "repo-research", type: "repo", status: "pending", artifact: "research/repo.md" },
  ];
  if (mode !== "quick") {
    tasks.push(
      { id: "tech-research", type: "tech", status: "pending", artifact: "research/tech.md" },
      { id: "business-research", type: "business", status: "pending", artifact: "research/business.md" },
    );
  }
  return tasks;
}

export function createInitialEpicState(input: {
  epicId: string;
  title: string;
  goal: string;
  mode: AtelierMode;
}): EpicState {
  return {
    version: 2,
    epic_id: input.epicId,
    title: input.title,
    goal: input.goal,
    mode: input.mode,
    status: "discovery",
    active_skill: "repo-analyst",
    current_slice: null,
    approval: defaultApprovalState(),
    allowed_actions: allowedActionsForStatus("discovery"),
    required_artifacts: requiredArtifactsForMode(input.mode),
    tasks: discoveryTasksForMode(input.mode),
    slices: [],
    guards: {
      baseline_ref: "HEAD",
      allowed_pre_execution_paths: [".atelier/**"],
    },
    violations: [],
  };
}

function planTemplate(title: string, mode: AtelierMode): string {
  return [
    `# Plan: ${title}`,
    "",
    "## Goal",
    "",
    "_TBD_",
    "",
    "## Mode",
    "",
    mode,
    "",
    "## Evidence Summary",
    "",
    "### Repository Evidence",
    "",
    "- _TBD_",
    "",
    "### Technical Evidence",
    "",
    mode === "quick" ? "- Optional for quick mode." : "- _TBD_",
    "",
    "### Business / Product Evidence",
    "",
    mode === "quick" ? "- Optional for quick mode." : "- _TBD_",
    "",
    "## Assumptions",
    "",
    "- _TBD_",
    "",
    "## Risks",
    "",
    "| Risk | Impact | Mitigation |",
    "|---|---:|---|",
    "| _TBD_ | _TBD_ | _TBD_ |",
    "",
    "## Slices",
    "",
    "### Slice 1 - TBD",
    "",
    "**Goal:** _TBD_",
    "",
    "**Allowed files:**",
    "",
    "- `_TBD_`",
    "",
    "**Acceptance criteria:**",
    "",
    "- _TBD_",
    "",
    "**Validation:**",
    "",
    "- _TBD_",
    "",
    "---",
    "",
    "## Approval",
    "",
    "Status: pending",
    "",
    "Human approval required before implementation.",
    "",
  ].join("
");
}

export function createArtifactTemplates(input: {
  title: string;
  mode: AtelierMode;
  epicId: string;
}): Record<string, string> {
  const base: Record<string, string> = {
    "questions.md": [
      `# Questions: ${input.title}`,
      "",
      "## Open questions",
      "",
      "- What repository facts still need to be mapped?",
      modeQuestion(input.mode),
      "",
    ].join("
"),
    "research/repo.md": [
      `# Repository Research: ${input.title}`,
      "",
      "## Existing architecture patterns",
      "",
      "- _TBD_",
      "",
      "## Relevant files",
      "",
      "- _TBD_",
      "",
      "## Similar implementations",
      "",
      "- _TBD_",
      "",
      "## Test locations",
      "",
      "- _TBD_",
      "",
      "## Risks",
      "",
      "- _TBD_",
      "",
      "## Unknowns",
      "",
      "- _TBD_",
      "",
    ].join("
"),
    "plan.md": planTemplate(input.title, input.mode),
    "execution-log.md": [
      `# Execution Log: ${input.title}`,
      "",
      "No slices executed yet.",
      "",
    ].join("
"),
    "review.md": [
      `# Review: ${input.title}`,
      "",
      "## What changed",
      "",
      "- Not reviewed yet.",
      "",
      "## Validation performed",
      "",
      "- None yet.",
      "",
      "## Risks remaining",
      "",
      "- _TBD_",
      "",
      "## Follow-up tasks",
      "",
      "- _TBD_",
      "",
      "## Can the epic be marked done?",
      "",
      "No.",
      "",
    ].join("
"),
  };

  if (input.mode !== "quick") {
    base["research/tech.md"] = [
      `# Technical Research: ${input.title}`,
      "",
      "## Libraries or APIs involved",
      "",
      "- _TBD_",
      "",
      "## Version constraints",
      "",
      "- _TBD_",
      "",
      "## Security concerns",
      "",
      "- _TBD_",
      "",
      "## Integration risks",
      "",
      "- _TBD_",
      "",
      "## Implementation notes",
      "",
      "- _TBD_",
      "",
    ].join("
");
    base["research/business.md"] = [
      `# Business Research: ${input.title}`,
      "",
      "## User or business goal",
      "",
      "- _TBD_",
      "",
      "## Happy path",
      "",
      "- _TBD_",
      "",
      "## Error paths",
      "",
      "- _TBD_",
      "",
      "## Edge cases",
      "",
      "- _TBD_",
      "",
      "## Acceptance criteria candidates",
      "",
      "- _TBD_",
      "",
    ].join("
");
    base["synthesis.md"] = [
      `# Synthesis: ${input.title}`,
      "",
      "## Evidence summary",
      "",
      "- _TBD_",
      "",
      "## Assumptions",
      "",
      "- _TBD_",
      "",
      "## Risks",
      "",
      "- _TBD_",
      "",
    ].join("
");
    base["decisions.md"] = [
      `# Decisions: ${input.title}`,
      "",
      "## Chosen design",
      "",
      "- _TBD_",
      "",
      "## Alternatives considered",
      "",
      "- _TBD_",
      "",
      "## Trade-offs",
      "",
      "- _TBD_",
      "",
    ].join("
");
    base["design.md"] = [
      `# Design: ${input.title}`,
      "",
      "## Solution design",
      "",
      "- _TBD_",
      "",
      "## Data contracts",
      "",
      "- _TBD_",
      "",
      "## API contracts",
      "",
      "- _TBD_",
      "",
      "## Rollback considerations",
      "",
      "- _TBD_",
      "",
    ].join("
");
  }

  if (input.mode === "deep") {
    base["risk-register.md"] = "# Risk Register

- _TBD_
";
    base["rollback.md"] = "# Rollback Plan

- _TBD_
";
    base["test-strategy.md"] = "# Test Strategy

- _TBD_
";
    base["critique.md"] = "# Critique

- _TBD_
";
  }

  return base;
}

function modeQuestion(mode: AtelierMode): string {
  if (mode === "quick") {
    return "- Is technical or business research necessary, or can repo evidence alone support the change?";
  }
  return "- Which technical and business unknowns must be resolved before design and planning?";
}
