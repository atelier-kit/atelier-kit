import type {
  ActiveState,
  AdapterName,
  AtelierConfig,
  AtelierMode,
  EpicState,
  SkillName,
} from "./schema.js";

export const STANDARD_ADAPTERS: AdapterName[] = [
  "cursor",
  "claude-code",
  "claude",
  "codex",
  "gemini-cli",
  "antigravity",
  "kiro",
  "kilo",
  "cline",
  "windsurf",
  "generic",
];

export const SKILLS: SkillName[] = [
  "questioner",
  "repo-analyst",
  "tech-analyst",
  "business-analyst",
  "planner",
  "designer",
  "reviewer",
];

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
    active_skill: "questioner",
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
    tasks.push(
      {
        id: "tech-research",
        type: "tech",
        status: "pending",
        artifact: "research/tech.md",
      },
    );
    if (mode === "deep") {
      tasks.push(
        {
          id: "business-research",
          type: "business",
          status: "pending",
          artifact: "research/business.md",
        },
      );
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

export function coreRule(): string {
  return `# Atelier-Kit Planning Protocol

Atelier-Kit is inactive by default. Treat Atelier as **off** unless one of
these is true:

1. The user explicitly uses \`/atelier\`.
2. The user asks to use Atelier-Kit.
3. \`.atelier/active.json\` has \`"active": true\`.
4. The current task belongs to an active Atelier epic.

When Atelier-Kit is inactive:

- Do not create Atelier artifacts.
- Do not enforce Atelier gates.
- Do not block normal agent behavior.
- Do not load Atelier skills.

When Atelier-Kit is active:

1. Read \`.atelier/atelier.json\`.
2. Read \`.atelier/active.json\`.
3. Read \`.atelier/epics/<active_epic>/state.json\`.
4. Load only the skill required by \`active_skill\`.
5. **Phase gate**: \`active_skill\` in \`state.json\` defines the only work permitted
   right now. The mandatory planning order is:

   \`questioner → repo-analyst → tech-analyst → [business-analyst] → designer → planner → reviewer\`

   Do not fill later artifacts early. If the user requests something that belongs
   to a later phase, respond: "Atelier phase gate: current skill is \`<active_skill>\`.
   Finish \`<artifact>\` before advancing." Then resume the current skill.
6. Before marking a planning task done, advancing to the next task, or telling
   the user the phase is ready for review, check for Plannotator with
   \`command -v plannotator\`. If it exists, run
   \`plannotator annotate .atelier/epics/<active_epic>/<artifact>.md\` for the
   active task's artifact and fold any notes back into that same artifact first.
7. \`atelier status\` only reports state. It is not a review gate and it does not
   replace the Plannotator step.
8. If \`status\` is \`planned\`, use the exported native plan mirror for implementation.
9. If \`status\` is \`review\`, compare the native implementation diff against \`plan.md\`.
10. After each protocol step and Plannotator pass, update the corresponding
    artifact and \`state.json\`.

If anything in \`.atelier/\` disagrees with reality, pause and fix it with \`atelier validate\` or \`atelier doctor\` instead of guessing.

The ledger file is \`.atelier/epics/<active_epic>/state.json\`. Ignore \`.atelier/context.md\` for v2 authority—it is not the source of truth.
`;
}

export function adapterRule(adapter: AdapterName): string {
  const label = adapter === "claude-code" || adapter === "claude" ? "Claude Code" : adapter;
  return `# Atelier-Kit adapter: ${label}

Same protocol as everywhere else—this file just spells out how **${label}** should behave.

- \`/plan ...\` stays host-native; native-plan hooks may activate Atelier V2 and nudge the same artifact flow.
- \`/atelier quick ...\`, \`/atelier plan ...\`, and \`/atelier deep ...\` turn Atelier on.
- "Use Atelier-Kit for this feature" counts too.

When active:

- Read \`.atelier/active.json\` and the active epic \`state.json\` before acting.
- Load only the skill named by \`active_skill\`.
- At \`planned\`, use the exported native plan mirror for implementation.
- After native implementation, run \`atelier review\` to compare the diff with \`plan.md\`.
`;
}

export function skillBody(skill: SkillName): string {
  const bodies: Record<SkillName, string> = {
    questioner: `# Questioner

## Mission

Create project-specific planning questions before research starts.

## Inputs

- \`.atelier/active.json\`
- Active epic \`state.json\`
- Epic title and goal

## Allowed reads

- \`.atelier/epics/<epic>/state.json\`
- Repository root docs/config for shallow orientation

## Allowed writes

- \`.atelier/epics/<epic>/questions.md\`
- \`.atelier/epics/<epic>/state.json\`

## Forbidden actions

- Do not edit project code.
- Do not perform deep research.
- Do not create slices.

## Output format

Write project-specific questions grouped by scope, architecture, data, auth, deploy, tests and risks.

## Completion criteria

\`questions.md\` contains project-specific questions or an explicit no-open-questions section.
`,
    "repo-analyst": `# Repo Analyst

## Mission

Map the repository facts needed for the active epic.

## Inputs

- \`.atelier/epics/<epic>/questions.md\`
- project source files
- tests
- dependency files
- routing/config files

## Allowed reads

- Project files relevant to the active epic
- Existing tests and dependency/config files

## Allowed writes

- \`.atelier/epics/<epic>/research/repo.md\`

## Forbidden actions

- Do not edit project code.
- Do not create slices.
- Do not make final architecture decisions.

## Output format

Write:

1. Existing architecture patterns.
2. Relevant files.
3. Similar implementations.
4. Test locations.
5. Risks.
6. Unknowns.

## Completion criteria

Repository evidence is concrete enough for planning and references actual files.
`,
    "tech-analyst": `# Tech Analyst

## Mission

Validate technical feasibility and dependency constraints.

## Inputs

- \`.atelier/epics/<epic>/questions.md\`
- dependency manifests
- framework/API documentation if needed

## Allowed reads

- Project dependency/config files
- Relevant external documentation when current facts are required

## Allowed writes

- \`.atelier/epics/<epic>/research/tech.md\`

## Forbidden actions

- Do not edit project code.
- Do not create slices.
- Do not finalize or implement the plan.

## Output format

Write:

1. Libraries or APIs involved.
2. Version constraints.
3. Security concerns.
4. Integration risks.
5. Implementation notes.

## Completion criteria

Technical constraints and integration risks are explicit and sourced.
`,
    "business-analyst": `# Business Analyst

## Mission

Map user flow, edge cases and acceptance criteria.

## Inputs

- User request
- \`.atelier/epics/<epic>/questions.md\`
- Product/business context available in the repo

## Allowed reads

- Product docs
- User-facing flows and tests

## Allowed writes

- \`.atelier/epics/<epic>/research/business.md\`

## Forbidden actions

- Do not edit project code.
- Do not create final slices.
- Do not make final architecture decisions.

## Output format

Write:

1. User/business goal.
2. Happy path.
3. Error paths.
4. Edge cases.
5. Acceptance criteria candidates.

## Completion criteria

Acceptance criteria candidates cover happy path, errors and edge cases.
`,
    planner: `# Planner

## Mission

Transform evidence into an executable plan.

## Inputs

- Research artifacts
- Design/decision artifacts when present
- Active epic \`state.json\`

## Allowed reads

- \`.atelier/epics/<epic>/**\`
- Project files referenced by evidence

## Allowed writes

- \`.atelier/epics/<epic>/synthesis.md\`
- \`.atelier/epics/<epic>/plan.md\`
- \`.atelier/epics/<epic>/state.json\`

## Forbidden actions

- Do not edit project code.
- Do not implement slices.

## Output format

Write:

1. Evidence summary.
2. Assumptions.
3. Risks.
4. Slices.
5. Acceptance criteria.
6. Validation steps.

## Completion criteria

The plan has reviewable slices with allowed files, acceptance criteria and validation.
`,
    designer: `# Designer

## Mission

Record architectural decisions and solution design.

## Inputs

- Research artifacts
- Active epic goal and constraints

## Allowed reads

- \`.atelier/epics/<epic>/**\`
- Project architecture and API files

## Allowed writes

- \`.atelier/epics/<epic>/decisions.md\`
- \`.atelier/epics/<epic>/design.md\`

## Forbidden actions

- Do not edit project code.
- Do not implement slices.

## Output format

Write:

1. Chosen design.
2. Alternatives considered.
3. Trade-offs.
4. Data contracts.
5. API contracts.
6. Rollback considerations.

## Completion criteria

Design decisions are traceable to evidence and ready for planning.
`,
    reviewer: `# Reviewer

## Mission

Review native implementation against the planned epic.

## Inputs

- Planned \`plan.md\`
- Current git diff and tests

## Allowed reads

- Project diff
- Test output
- Atelier artifacts

## Allowed writes

- \`.atelier/epics/<epic>/review.md\`
- \`.atelier/epics/<epic>/state.json\`

## Forbidden actions

- Do not implement new scope.
- Do not hide failed or skipped validation.

## Output format

Write:

1. What changed.
2. Validation performed.
3. Risks remaining.
4. Follow-up tasks.
5. Whether the epic can be marked done.

## Completion criteria

Review states whether the epic can be marked done and why.
`,
  };
  return bodies[skill];
}

export function schemaJson(name: string): string {
  const schemas: Record<string, unknown> = {
    "atelier.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      title: "Atelier configuration",
      type: "object",
      required: ["version", "protocol", "default_agent_mode", "default_atelier_mode", "adapter", "rules", "guards"],
      properties: {
        version: { const: 2 },
        protocol: { const: "atelier-planning-protocol" },
        default_agent_mode: { const: "native" },
        default_atelier_mode: { enum: ["quick", "standard", "deep"] },
        adapter: { enum: STANDARD_ADAPTERS },
        rules: { type: "object" },
        guards: { type: "object" },
      },
    },
    "active.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      title: "Atelier active state",
      type: "object",
      required: ["active", "mode", "active_epic", "active_phase", "active_skill", "updated_at"],
      properties: {
        active: { type: "boolean" },
        mode: { enum: ["native", "atelier"] },
        active_epic: { type: ["string", "null"] },
        active_phase: { type: ["string", "null"] },
        active_skill: { type: ["string", "null"] },
        updated_at: { type: ["string", "null"] },
      },
    },
    "epic-state.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      title: "Atelier epic state",
      type: "object",
      required: ["version", "epic_id", "title", "goal", "mode", "status", "approval", "allowed_actions", "required_artifacts", "tasks", "slices", "guards", "violations"],
      properties: {
        version: { const: 2 },
        epic_id: { type: "string", minLength: 1 },
        title: { type: "string", minLength: 1 },
        goal: { type: "string", minLength: 1 },
        mode: { enum: ["quick", "standard", "deep"] },
        status: { enum: ["native", "idle", "discovery", "synthesis", "design", "planning", "planned", "review", "done", "blocked"] },
        approval: { "$ref": "gate.schema.json#/definitions/approval" },
        slices: { type: "array", items: { "$ref": "slice.schema.json" } },
      },
    },
    "slice.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      title: "Atelier slice",
      type: "object",
      required: ["id", "title", "status", "goal", "allowed_files", "acceptance_criteria", "validation"],
      properties: {
        id: { type: "string", minLength: 1 },
        title: { type: "string", minLength: 1 },
        status: { enum: ["draft", "ready", "done", "blocked"] },
        goal: { type: "string", minLength: 1 },
        depends_on: { type: "array", items: { type: "string" } },
        allowed_files: { type: "array", items: { type: "string" } },
        acceptance_criteria: { type: "array", items: { type: "string" } },
        validation: { type: "array", items: { type: "string" } },
      },
    },
    "gate.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      title: "Atelier gate contracts",
      definitions: {
        approval: {
          type: "object",
          required: ["status", "approved_by", "approved_at", "notes"],
          properties: {
            status: { enum: ["none", "pending", "approved", "rejected"] },
            approved_by: { type: ["string", "null"] },
            approved_at: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
          },
        },
      },
    },
    "plan.schema.json": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      title: "Atelier plan markdown expectations",
      type: "object",
      properties: {
        required_headings: {
          type: "array",
          items: { enum: ["Goal", "Mode", "Evidence Summary", "Assumptions", "Risks", "Slices", "Native Implementation"] },
        },
      },
    },
  };
  return `${JSON.stringify(schemas[name] ?? {}, null, 2)}\n`;
}

export function schemaFiles(): Record<string, string> {
  return {
    "atelier.schema.json": schemaJson("atelier.schema.json"),
    "active.schema.json": schemaJson("active.schema.json"),
    "epic-state.schema.json": schemaJson("epic-state.schema.json"),
    "slice.schema.json": schemaJson("slice.schema.json"),
    "gate.schema.json": schemaJson("gate.schema.json"),
    "plan.schema.json": schemaJson("plan.schema.json"),
  };
}

export const workflowYaml = `name: atelier-planning-protocol
version: 2

states:
  native:
    atelier_active: false
    can_write_project_code: true
  idle:
    atelier_active: true
    can_write_project_code: false
    next: [discovery]
  discovery:
    can_write_project_code: false
    skills: [questioner, repo-analyst, tech-analyst, business-analyst]
    next: [synthesis, planning, blocked]
  synthesis:
    can_write_project_code: false
    skills: [planner]
    next: [design, planning, blocked]
  design:
    can_write_project_code: false
    skills: [designer]
    next: [planning, blocked]
  planning:
    can_write_project_code: false
    skills: [planner]
    next: [planned, blocked]
  planned:
    can_write_project_code: true
    next: [review, done, blocked]
  review:
    can_write_project_code: false
    skills: [reviewer]
    next: [done, planned, blocked]
  done:
    can_write_project_code: false
  blocked:
    can_write_project_code: false
`;

export const modesYaml = `modes:
  quick:
    description: Small, low-risk change.
    required_artifacts:
      - questions.md
      - research/repo.md
      - plan.md
      - review.md
    research_tracks:
      repo: required
      tech: optional
      business: optional
    max_recommended_slices: 3
  standard:
    description: Normal feature or medium change.
    required_artifacts:
      - questions.md
      - research/repo.md
      - research/tech.md
      - synthesis.md
      - decisions.md
      - design.md
      - plan.md
      - review.md
    research_tracks:
      repo: required
      tech: required
      business: optional
  deep:
    description: High-risk architectural or product change.
    required_artifacts:
      - questions.md
      - research/repo.md
      - research/tech.md
      - research/business.md
      - synthesis.md
      - decisions.md
      - design.md
      - risk-register.md
      - rollback.md
      - test-strategy.md
      - plan.md
      - critique.md
      - review.md
    research_tracks:
      repo: required
      tech: required
      business: required
      risk: required
`;

export const gatesYaml = `gates:
  plan_ready:
    description: Plan must be reviewable before native implementation.
    require:
      - active.active=true
      - state.status=planned
      - plan.md exists
      - plan_has_goal
      - plan_has_slices
      - each_slice_has_goal
      - each_slice_has_acceptance_criteria
      - risks_are_documented
      - validation_steps_are_documented
  after_review:
    description: Review must compare native implementation with the plan.
    require:
      - review.md exists
      - plan_compliance_recorded
      - validation_result_present
`;

export function planTemplate(params: {
  title: string;
  goal: string;
  mode: Exclude<AtelierMode, "native">;
}): string {
  return `# Plan: ${params.title}

## Goal

${params.goal}

## Mode

${params.mode}

## Evidence Summary

### Repository Evidence

- Pending repository research.

### Technical Evidence

- Pending technical research.

### Business / Product Evidence

- Pending business research.

## Assumptions

- Pending validation.

## Risks

| Risk | Impact | Mitigation |
|---|---:|---|
| Native implementation may diverge from plan | Medium | Review diff against planned slices |

## Slices

No slices defined yet.

## Native Implementation

Use the exported native plan mirror after Atelier finalizes this epic as \`planned\`.
`;
}

export const skillsYaml = `skills:
  questioner:
    file: .atelier/skills/questioner.md
    allowed_states: [discovery]
    writes: [questions.md]
  repo-analyst:
    file: .atelier/skills/repo-analyst.md
    allowed_states: [discovery]
    writes: [research/repo.md]
  tech-analyst:
    file: .atelier/skills/tech-analyst.md
    allowed_states: [discovery]
    writes: [research/tech.md]
  business-analyst:
    file: .atelier/skills/business-analyst.md
    allowed_states: [discovery]
    writes: [research/business.md]
  planner:
    file: .atelier/skills/planner.md
    allowed_states: [synthesis, planning, planned]
    writes: [synthesis.md, plan.md]
  designer:
    file: .atelier/skills/designer.md
    allowed_states: [design]
    writes: [decisions.md, design.md]
  reviewer:
    file: .atelier/skills/reviewer.md
    allowed_states: [review]
    writes: [review.md]
`;

export function schemaFile(name: string): string {
  const base = {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    title: name,
    type: "object",
  };
  const schemas: Record<string, object> = {
    "atelier.schema.json": {
      ...base,
      required: ["version", "protocol", "default_agent_mode", "default_atelier_mode", "adapter", "rules", "guards"],
      properties: {
        version: { const: 2 },
        protocol: { const: "atelier-planning-protocol" },
        default_agent_mode: { const: "native" },
        default_atelier_mode: { enum: ["quick", "standard", "deep"] },
        adapter: { enum: STANDARD_ADAPTERS },
        rules: { type: "object" },
        guards: { type: "object" },
      },
    },
    "active.schema.json": {
      ...base,
      required: ["active", "mode", "active_epic", "active_phase", "active_skill", "updated_at"],
      properties: {
        active: { type: "boolean" },
        mode: { enum: ["native", "atelier"] },
        active_epic: { type: ["string", "null"] },
        active_phase: { type: ["string", "null"] },
        active_skill: { type: ["string", "null"] },
        updated_at: { type: ["string", "null"] },
      },
    },
    "epic-state.schema.json": {
      ...base,
      required: [
        "version",
        "epic_id",
        "title",
        "goal",
        "mode",
        "status",
        "approval",
        "allowed_actions",
        "required_artifacts",
        "tasks",
        "slices",
        "guards",
        "violations",
      ],
      properties: {
        version: { const: 2 },
        epic_id: { type: "string", minLength: 1 },
        title: { type: "string", minLength: 1 },
        goal: { type: "string", minLength: 1 },
        mode: { enum: ["quick", "standard", "deep"] },
        status: {
          enum: [
            "native",
            "idle",
            "discovery",
            "synthesis",
            "design",
            "planning",
            "planned",
            "review",
            "done",
            "blocked",
          ],
        },
        approval: { type: "object" },
        allowed_actions: { type: "object" },
        required_artifacts: { type: "array", items: { type: "string" } },
        tasks: { type: "array" },
        slices: { type: "array" },
        guards: { type: "object" },
        violations: { type: "array", items: { type: "string" } },
      },
    },
    "slice.schema.json": {
      ...base,
      required: ["id", "title", "status", "goal", "allowed_files", "acceptance_criteria", "validation"],
      properties: {
        id: { type: "string", minLength: 1 },
        title: { type: "string", minLength: 1 },
        status: { enum: ["draft", "ready", "done", "blocked"] },
        goal: { type: "string", minLength: 1 },
        depends_on: { type: "array", items: { type: "string" } },
        allowed_files: { type: "array", items: { type: "string" } },
        acceptance_criteria: { type: "array", items: { type: "string" } },
        validation: { type: "array", items: { type: "string" } },
      },
    },
    "gate.schema.json": {
      ...base,
      properties: {
        gates: { type: "object" },
      },
    },
    "plan.schema.json": {
      ...base,
      properties: {
        goal: { type: "string" },
        slices: { type: "array" },
      },
    },
  };
  return `${JSON.stringify(schemas[name] ?? base, null, 2)}\n`;
}
