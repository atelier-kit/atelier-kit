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
    return ["plan.md", "review.md"];
  }
  if (mode === "standard") {
    return ["research.md", "plan.md", "review.md"];
  }
  return ["research.md", "design.md", "plan.md", "review.md"];
}

export function researchSectionsForMode(
  mode: Exclude<AtelierMode, "native">,
): string[] {
  const sections = [
    "Questions",
    "Codebase",
    "Constraints",
    "What exists vs what will be created",
    "Open unknowns",
  ];
  if (mode === "deep") {
    sections.splice(3, 0, "Product behavior");
  }
  return sections;
}

export function designSectionsForMode(
  mode: Exclude<AtelierMode, "native">,
): string[] {
  const sections = ["Chosen design", "Decisions", "Contracts", "Design risks"];
  if (mode === "deep") {
    sections.push("Risk register", "Rollback", "Test strategy");
  }
  return sections;
}

export function defaultEpicState(params: {
  epicId: string;
  title: string;
  goal: string;
  mode: Exclude<AtelierMode, "native">;
  baselineRef?: string;
}): EpicState {
  const required = requiredArtifactsForMode(params.mode);
  const quick = params.mode === "quick";
  return {
    version: 2,
    epic_id: params.epicId,
    title: params.title,
    goal: params.goal,
    mode: params.mode,
    status: quick ? "planning" : "discovery",
    active_skill: quick ? "planner" : "questioner",
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

function tasksForMode(mode: Exclude<AtelierMode, "native">): EpicState["tasks"] {
  if (mode === "quick") {
    return [
      { id: "plan", type: "planning", status: "pending", artifact: "plan.md" },
    ];
  }
  const tasks: EpicState["tasks"] = [
    { id: "questions", type: "questions", status: "pending", artifact: "research.md" },
    { id: "research", type: "research", status: "pending", artifact: "research.md" },
  ];
  if (mode === "deep") {
    tasks.push({ id: "design", type: "design", status: "pending", artifact: "design.md" });
  }
  tasks.push({ id: "plan", type: "planning", status: "pending", artifact: "plan.md" });
  return tasks;
}

export const SEED_QUESTIONS = [
  "- [codebase] Which existing files and patterns constrain this work?",
  "- [constraints] Which framework or dependency constraints need verification?",
  "- [product] What user-visible outcomes and edge cases define success?",
];

export function researchStub(
  title: string,
  mode: Exclude<AtelierMode, "native">,
): string {
  const body = researchSectionsForMode(mode)
    .map((section) =>
      section === "Questions"
        ? `## Questions\n\n${SEED_QUESTIONS.join("\n")}`
        : `## ${section}\n\n_Pending._`,
    )
    .join("\n\n");
  return `# Research: ${title}\n\nKeep this document consolidated and compact (target 50–300 lines).\nEvery claim should cite a path, symbol, command or source.\n\n${body}\n`;
}

export function designStub(
  title: string,
  mode: Exclude<AtelierMode, "native">,
): string {
  const body = designSectionsForMode(mode)
    .map((section) => `## ${section}\n\n_Pending._`)
    .join("\n\n");
  return `# Design: ${title}\n\nRecord decisions in ADR style under \`## Decisions\` (decision, context, alternatives, consequences).\n\n${body}\n`;
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
    const researchNotes = mode === "quick"
      ? `## Research Notes

Quick mode keeps research inline. Record here the files, symbols and
constraints that ground this plan (state what exists vs what will be created).

- _Pending._

`
      : "";
    return `# Plan: ${title}

## Goal

${planGoal}

## Mode

${planMode}

${researchNotes}## Evidence Summary

- _Pending._

## Assumptions

- _Pending._

## Risks

| Risk | Impact | Mitigation |
|---|---:|---|
| _Pending_ | _TBD_ | _TBD_ |

## Slices

_Pending._

## Progress

The plan is a living artifact: record per-slice progress here during native
implementation and re-export the mirror when it changes.

- _No slices implemented yet._

## Native Implementation

When this plan is ready, Atelier finalizes the epic as \`planned\` and exports a
native plan mirror for the host agent.
`;
  }
  return `# ${heading}

_Pending for ${title}._
`;
}
