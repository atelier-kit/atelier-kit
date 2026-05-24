import type {
  ActiveState,
  AdapterName,
  AtelierConfig,
  AtelierMode,
  EpicState,
} from "./schema.js";

export function defaultAtelierConfig(
  adapter: AdapterName = "generic",
  mode: Exclude<AtelierMode, "native"> = "standard",
): AtelierConfig {
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
      detect_unplanned_code_changes: true,
      use_git_diff: true,
    },
  };
}

export function inactiveState(): ActiveState {
  return {
    active: false,
    mode: "native",
    active_epic: null,
    active_phase: null,
    active_skill: null,
    updated_at: null,
  };
}

export function requiredArtifactsForMode(
  mode: Exclude<AtelierMode, "native">,
): string[] {
  if (mode === "quick") {
    return [
      "questions.md",
      "research/repo.md",
      "plan.md",
      "review.md",
    ];
  }
  const standard = [
    "questions.md",
    "research/repo.md",
    "research/tech.md",
    "synthesis.md",
    "decisions.md",
    "design.md",
    "plan.md",
    "review.md",
  ];
  if (mode === "standard") return standard;
  return [
    ...standard.slice(0, 3),
    "research/business.md",
    ...standard.slice(3, 6),
    "risk-register.md",
    "rollback.md",
    "test-strategy.md",
    "plan.md",
    "critique.md",
    "review.md",
  ];
}

function tasksForMode(mode: Exclude<AtelierMode, "native">): EpicState["tasks"] {
  const tasks: EpicState["tasks"] = [
    {
      id: "questions",
      type: "questions",
      status: "pending",
      artifact: "questions.md",
    },
    {
      id: "repo-research",
      type: "repo",
      status: "pending",
      artifact: "research/repo.md",
    },
  ];
  if (mode !== "quick") {
    tasks.push({
      id: "tech-research",
      type: "tech",
      status: "pending",
      artifact: "research/tech.md",
    });
    if (mode === "deep") {
      tasks.push({
        id: "business-research",
        type: "business",
        status: "pending",
        artifact: "research/business.md",
      });
    }
    tasks.push(
      {
        id: "synthesis",
        type: "synthesis",
        status: "pending",
        artifact: "synthesis.md",
      },
      {
        id: "design",
        type: "design",
        status: "pending",
        artifact: "design.md",
      },
    );
  }
  tasks.push({
    id: "plan",
    type: "planning",
    status: "pending",
    artifact: "plan.md",
  });
  return tasks;
}

export function defaultEpicState(params: {
  epicId: string;
  title: string;
  goal: string;
  mode: Exclude<AtelierMode, "native">;
  baselineRef?: string;
}): EpicState {
  const required = requiredArtifactsForMode(params.mode);
  return {
    version: 2,
    epic_id: params.epicId,
    title: params.title,
    goal: params.goal,
    mode: params.mode,
    status: "discovery",
    active_skill: "researcher",
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
    required_artifacts: required,
    tasks: tasksForMode(params.mode),
    slices: [],
    guards: {
      baseline_ref: params.baselineRef ?? "HEAD",
      allowed_pre_planned_paths: [".atelier/**"],
    },
    violations: [],
  };
}

export function emptyArtifact(
  name: string,
  title: string,
  goal?: string,
  mode?: Exclude<AtelierMode, "native">,
): string {
  const heading = name
    .replace(/\.md$/, "")
    .replace(/[-/]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const planGoal = goal ?? "_To be completed by the planner skill._";
  const planMode = mode ?? "_quick | standard | deep_";
  if (name === "plan.md") {
    return `# Plan: ${title}

## Goal

${planGoal}

## Mode

${planMode}

## Evidence Summary

### Repository Evidence

- _Pending._

### Technical Evidence

- _Pending._

### Business / Product Evidence

- _Pending._

## Assumptions

- _Pending._

## Risks

| Risk | Impact | Mitigation |
|---|---:|---|
| _Pending_ | _TBD_ | _TBD_ |

## Slices

_Pending._

## Native Implementation

When this plan is ready, Atelier finalizes the epic as \`planned\` and exports a
native plan mirror for the host agent.
`;
  }
  return `# ${heading}

_Pending for ${title}._
`;
}
