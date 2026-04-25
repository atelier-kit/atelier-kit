# atelier-kit execution flow

This document describes the execution idea implemented by atelier-kit.

The important point is that atelier-kit does **not** jump from a goal directly to
code. It first turns the goal into planning questions, routes those questions to
specialized researcher tasks, synthesizes the evidence into a plan, stops for
human approval, and only then executes approved vertical slices.

High-level PNG:

![atelier-kit mental execution flow](./assets/atelier-mental-execution-flow.png)

## Mental Model

```mermaid
flowchart LR
  A["Objective: /planner goal"] --> B["Goal classifier"]
  B --> C["Epic in .atelier/context.md"]
  C --> D["Question model creates scoped tasks"]

  D --> R["Repo researcher: repo task"]
  D --> T["Tech researcher: tech task"]
  D --> U["Business researcher: business task"]

  R --> S["Synthesis: planner task"]
  T --> S
  U --> S

  S --> D2["Decision: designer task"]
  D2 --> P["Plan: .atelier/plan/<slug>/plan.md + design.md"]
  P --> G{"Human gate: approve or reject"}

  G -->|"reject"| D
  G -->|"approve"| E["Execution mode"]
  E --> X1["Slice 1: implementer"]
  X1 --> X2["Slice 2: implementer"]
  X2 --> XN["Slice N: implementer"]
  XN --> V["Review and gates"]
```

## Implemented Happy Path

```mermaid
sequenceDiagram
  participant Human
  participant CLI as atelier-kit CLI
  participant Planner as Planner runtime
  participant State as .atelier/context.md
  participant Skills as Active skills
  participant Plan as .atelier/plan/<slug>/plan.md

  Human->>CLI: atelier-kit planner autoplan "goal"
  CLI->>Planner: startPlannerGoal(goal)
  Planner->>Planner: classify goal and choose task template
  Planner->>State: create epic + repo/tech/business/synthesis tasks

  loop discovery tasks (repo, tech, business)
    Planner->>State: focus current_task
    State->>Skills: route task type to skill
    Skills-->>Planner: evidence and task completion
    Planner->>State: markCurrentDone()
  end

  Planner->>Planner: generateSlicesForSynthesis()
  Planner->>State: focus decision task
  State->>Skills: route to designer skill
  Skills-->>Planner: design.md filled with architectural decisions
  Planner->>State: markCurrentDone()

  Planner->>Plan: write reviewable plan.md + design.md
  Planner->>State: planner_state=awaiting_approval, approval_status=pending

  Human->>CLI: atelier-kit planner approve
  CLI->>Planner: approvePlannerPlan()
  Planner->>Planner: validate plan before approval
  Planner->>State: approval_status=approved

  Human->>CLI: atelier-kit planner execute
  CLI->>Planner: executeApprovedPlan()
  Planner->>State: planner_state=executing, current_slice=first approved slice
  State->>Skills: route current slice to implementer
```

## What Gets Created From An Objective

`startPlannerGoal` receives a raw goal and creates one epic plus a set of tasks.
The task template is selected by `classifyGoal` in `src/state/task-templates.ts`.

Supported goal classes:

- `migration`
- `new-feature`
- `refactor`
- `infrastructure`
- `research`
- `default`

Each template creates the same planning shape:

| Task type | Active skill | Purpose |
|-----------|--------------|---------|
| `repo` | `repo-analyst` | Map repository facts: entrypoints, contracts, dependencies, tests, persistence, and operational boundaries. |
| `tech` | `tech-analyst` | Gather external evidence: platform constraints, APIs, versions, tradeoffs, compatibility, security, or migration risks. |
| `business` | `business-analyst` | Clarify rollout, stakeholder impact, acceptance criteria, operational risk, and decision constraints. |
| `synthesis` | `planner` | Converge the discovery tracks into executable slices, dependencies, risks, and acceptance checks. |

The `repo`, `tech`, and `business` tasks receive a shared `parallel_group`.
That models them as parallel discovery tracks, even though the built-in
`autoplan` command advances them sequentially.

## Task And Slice Boundary

The framework makes a hard distinction between planning work and delivery work.

```mermaid
flowchart TD
  A["Task"] --> B["Planning unit"]
  B --> C["Learn, research, decide, synthesize"]
  C --> D["Output: evidence and plan structure"]

  E["Slice"] --> F["Execution unit"]
  F --> G["Deliver end-to-end value"]
  G --> H["Output: source changes and validation"]
```

Use this rule:

- **Tasks** answer: what do we need to learn, decide, or de-risk?
- **Slices** answer: what can we safely deliver end-to-end next?

## Runtime State Machine

```mermaid
stateDiagram-v2
  [*] --> idle

  idle --> planning: startPlannerGoal / add epic/task/slice
  planning --> planning: repo, tech, business tasks
  planning --> planning: synthesis task
  planning --> awaiting_approval: synthesis done + current epic has slices

  awaiting_approval --> planning: rejectPlan(reason)
  awaiting_approval --> approved: approvePlan()

  approved --> executing: executePlan()
  executing --> executing: done current slice / next slice

  planning --> idle: setWorkflow(phased)
  awaiting_approval --> idle: setWorkflow(phased)
  approved --> idle: setWorkflow(phased)
  executing --> idle: setWorkflow(phased)
```

The planner state is stored in `.atelier/context.md`.

Important fields:

- `workflow`
- `planner_mode`
- `planner_state`
- `approval_status`
- `current_epic`
- `current_task`
- `current_slice`
- `epics[]`
- `tasks[]`
- `slices[]`

The `phase` field still exists, but it is an internal routing lens used by skills
and adapters. The planner state is the machine state.

## Skill Routing

Skill routing is implemented in `src/skill-loader.ts`.

```mermaid
flowchart TD
  A["Read .atelier/context.md"] --> B{"Planner awaiting approval?"}
  B -->|"yes"| C["planner"]
  B -->|"no"| D{"current_task?"}
  D -->|"yes"| E["route by task type"]
  E --> F["repo -> repo-analyst"]
  E --> G["tech -> tech-analyst"]
  E --> H["business -> business-analyst"]
  E --> I["synthesis -> planner"]
  E --> J["decision -> designer"]
  E --> K["implementation -> implementer"]

  D -->|"no"| L{"current_slice + executing?"}
  L -->|"yes"| M["implementer"]
  L -->|"no"| N["fallback to phase skill"]
```

## Approval Gate

Execution is blocked until the plan is approved.

```mermaid
flowchart TD
  A["presentPlannerPlan"] --> B["requires at least one slice"]
  B --> C["planner_state=awaiting_approval"]
  C --> D["approval_status=pending"]
  D --> E["write .atelier/plan/<slug>/plan.md + mirror artifacts/plan.md"]

  E --> F["approvePlannerPlan"]
  F --> G["validatePlanBeforeApproval"]
  G --> H{"blocking errors?"}
  H -->|"yes"| I["throw: Plan approval blocked"]
  H -->|"no"| J["planner_state=approved"]
  J --> K["approval_status=approved"]

  K --> L["executeApprovedPlan"]
  L --> M["only current epic's ready slices become executing"]
  M --> N["current_slice = first executing slice"]
  N --> O["phase=implement"]
```

Current approval validation checks:

- synthesis task is done
- at least one slice exists
- each slice has a goal
- warnings are emitted for incomplete discovery or missing acceptance criteria

## Dependency And Safety Checks

The planner validates entity links before writing state.

```mermaid
flowchart TD
  A["add/update task"] --> B["epic exists"]
  B --> C["task dependencies exist"]
  C --> D["dependencies belong to same epic"]
  D --> E["linked slice belongs to same epic"]
  E --> F["DependencyGraph detects cycles"]
  F --> G["write state"]

  H["add/update slice"] --> I["epic exists"]
  I --> J["task/slice dependencies exist"]
  J --> K["dependencies belong to same epic"]
  K --> L["source tasks belong to same epic"]
  L --> M["DependencyGraph detects cycles"]
  M --> N["write state"]
```

Focus selection also stays within `current_epic`. Blocked tasks are not selected as
the next focus.

## What `plan.md` Represents

`plan.md` is a review projection, not the only source of truth. The canonical copy for each planning run lives under `.atelier/plan/<slug-do-epico>/plan.md` (with `context.md` and `manifest.json` alongside it). The same content is mirrored to `.atelier/artifacts/plan.md` for compatibility.

It is generated from planner state and includes:

- metadata header
- active epic
- parallel discovery tracks
- proposed slices
- dependency map
- risk register
- open questions
- human review status

The graph in `.atelier/context.md` is operational truth. The markdown plan is the
human approval surface.

## Adapter Refresh

After planner commands mutate state, generated adapters are refreshed when the
active adapter depends on fallback instruction files.

```mermaid
flowchart TD
  A["planner command succeeds"] --> B["refreshFallbackAdapters"]
  B --> C["read .atelierrc"]
  C --> D{"adapter is generated fallback?"}
  D -->|"no"| E["return"]
  D -->|"yes"| F["installAdapter"]
  F --> G["AGENTS.md / rules / prompt file updated"]
```

This keeps host agents aligned with the current planner state and command protocol.

## One Sentence Summary

atelier-kit turns a raw objective into structured discovery tasks, synthesizes those
tasks into a reviewable slice plan, requires human approval, and then coordinates
execution one approved slice at a time.
