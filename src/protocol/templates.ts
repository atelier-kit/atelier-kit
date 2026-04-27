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
  "cline",
  "windsurf",
  "generic",
];

export const SKILLS: SkillName[] = [
  "repo-analyst",
  "tech-analyst",
  "business-analyst",
  "planner",
  "designer",
  "implementer",
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
      detect_pre_approval_code_changes: true,
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

export function pausedState(epicId: string): ActiveState {
  return {
    active: false,
    mode: "native",
    active_epic: epicId,
    active_phase: "paused",
    active_skill: null,
    updated_at: new Date().toISOString(),
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
      "execution-log.md",
      "review.md",
    ];
  }
  const standard = [
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
  if (mode === "standard") return standard;
  return [
    ...standard.slice(0, 7),
    "risk-register.md",
    "rollback.md",
    "test-strategy.md",
    "plan.md",
    "critique.md",
    "execution-log.md",
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
    required_artifacts: required,
    tasks: tasksForMode(params.mode),
    slices: [],
    guards: {
      baseline_ref: params.baselineRef ?? "HEAD",
      allowed_pre_execution_paths: [".atelier/**"],
    },
    violations: [],
  };
}

function tasksForMode(mode: Exclude<AtelierMode, "native">): EpicState["tasks"] {
  const tasks: EpicState["tasks"] = [
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
      {
        id: "business-research",
        type: "business",
        status: "pending",
        artifact: "research/business.md",
      },
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

## Approval

Status: pending

Human approval required before implementation.
`;
  }
  return `# ${heading}

_Pending for ${title}._
`;
}

export function coreRule(): string {
  return `# Atelier-Kit Planning Protocol

Atelier-Kit is inactive by default.

Use the host agent's normal behavior unless one of these is true:

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
5. If \`allowed_actions.write_project_code\` is false, do not edit project code.
6. If \`status\` is \`awaiting_approval\`, present \`plan.md\` and stop.
7. If \`status\` is \`execution\`, execute only \`current_slice\`.
8. After each protocol step, update the corresponding artifact and \`state.json\`.

Never invent missing state. If protocol state is missing or inconsistent, stop and request repair through \`atelier validate\` or \`atelier doctor\`.
`;
}

export function adapterRule(adapter: AdapterName): string {
  const label = adapter === "claude-code" || adapter === "claude" ? "Claude Code" : adapter;
  return `# Atelier-Kit adapter: ${label}

This adapter extends the host agent's native planning only when Atelier-Kit is explicitly activated.

- \`/plan ...\` remains native host-agent planning. Do not create Atelier artifacts.
- \`/atelier quick ...\`, \`/atelier plan ...\`, and \`/atelier deep ...\` activate Atelier.
- "Use Atelier-Kit for this feature" also activates Atelier.

When active:

- Read \`.atelier/active.json\` and the active epic \`state.json\` before acting.
- Load only the skill named by \`active_skill\`.
- Do not edit project code unless the active epic is in \`execution\` with approved approval status.
`;
}

export function skillBody(skill: SkillName): string {
  const bodies: Record<SkillName, string> = {
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
- Do not approve implementation.

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
- Do not mark a plan as approved.
- Do not execute slices.

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
- Do not execute slices.

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
    implementer: `# Implementer

## Mission

Execute only the current approved slice.

## Inputs

- Active epic \`state.json\`
- Approved \`plan.md\`
- \`current_slice\`

## Allowed reads

- Files needed to implement the current slice

## Allowed writes

- Project files included in \`current_slice.allowed_files\`
- \`.atelier/epics/<epic>/execution-log.md\`
- \`.atelier/epics/<epic>/state.json\`

## Forbidden actions

- Do not execute future slices.
- Do not change files outside the slice scope unless needed and documented.
- Do not alter the approved plan silently.
- Do not mark unvalidated work as done.

## Output format

Update the execution log with implementation and validation notes.

## Completion criteria

The current slice is done, blocked, or needs review with validation recorded.
`,
    reviewer: `# Reviewer

## Mission

Review completed execution against the approved plan.

## Inputs

- Approved \`plan.md\`
- \`execution-log.md\`
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
- Do not approve your own unvalidated changes.

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
        status: { enum: ["native", "idle", "discovery", "synthesis", "design", "planning", "awaiting_approval", "approved", "execution", "review", "done", "blocked", "paused"] },
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
        status: { enum: ["draft", "ready", "executing", "done", "blocked", "needs-review"] },
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
          items: { enum: ["Goal", "Mode", "Evidence Summary", "Assumptions", "Risks", "Slices", "Approval"] },
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
    skills: [repo-analyst, tech-analyst, business-analyst]
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
    next: [awaiting_approval, blocked]
  awaiting_approval:
    can_write_project_code: false
    requires_human_action: true
    next: [approved, planning, blocked]
  approved:
    can_write_project_code: false
    next: [execution]
  execution:
    can_write_project_code: true
    skills: [implementer]
    requires: [approval.status=approved, current_slice]
    next: [execution, review, blocked]
  review:
    can_write_project_code: false
    skills: [reviewer]
    next: [done, execution, blocked]
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
      - execution-log.md
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
      - research/business.md
      - synthesis.md
      - decisions.md
      - design.md
      - plan.md
      - execution-log.md
      - review.md
    research_tracks:
      repo: required
      tech: required
      business: required
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
      - execution-log.md
      - review.md
    research_tracks:
      repo: required
      tech: required
      business: required
      risk: required
`;

export const gatesYaml = `gates:
  before_code:
    description: Project code cannot be edited unless execution is approved.
    require:
      - active.active=true
      - state.status=execution
      - state.approval.status=approved
      - state.allowed_actions.write_project_code=true
      - state.current_slice!=null
  before_approval:
    description: Plan must be reviewable by a human.
    require:
      - plan.md exists
      - plan_has_goal
      - plan_has_slices
      - each_slice_has_acceptance_criteria
      - risks_are_documented
      - validation_steps_are_documented
  before_execution:
    description: Execution can only start after human approval.
    require:
      - approval.status=approved
      - state.status=approved
      - at_least_one_slice_ready
  after_slice:
    description: Each slice must leave trace.
    require:
      - execution-log.md updated
      - slice_status in [done, blocked, needs-review]
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
| Plan is not approved yet | High | Stop before execution and request human approval |

## Slices

No slices defined yet.

## Approval

Status: pending

Human approval required before implementation.
`;
}

export const skillsYaml = `skills:
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
    allowed_states: [synthesis, planning, awaiting_approval]
    writes: [synthesis.md, plan.md]
  designer:
    file: .atelier/skills/designer.md
    allowed_states: [design]
    writes: [decisions.md, design.md]
  implementer:
    file: .atelier/skills/implementer.md
    allowed_states: [execution]
    writes: [execution-log.md, project_code]
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
            "awaiting_approval",
            "approved",
            "execution",
            "review",
            "done",
            "blocked",
            "paused",
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
        status: { enum: ["draft", "ready", "executing", "done", "blocked", "needs-review"] },
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

