# atelier-kit v2 architecture

This document explains the internal architecture of the Atelier-Kit v2 planning
protocol.

It is meant for maintainers and contributors who want to understand:

- where protocol state lives
- how gates and approval states work
- how CLI helpers initialize, validate and render rules
- how adapters, skills and artifacts fit together

For day-to-day usage by host agents, read [AGENT-USAGE.md](./AGENT-USAGE.md).

## Architectural summary

atelier-kit is organized around five layers:

1. **State layer**
2. **Protocol and gate layer**
3. **CLI layer**
4. **Adapter layer**
5. **Skill and artifact layer**

These layers are intentionally separate.

### Why this matters

The protocol works because:

- runtime state is explicit and persistent
- activation is explicit
- adapters expose small host-specific rules
- skills are loaded on demand
- validation detects broken state and premature code edits

---

## 1. State layer

### Global files

- `.atelier/atelier.json`
- `.atelier/active.json`

`atelier.json` stores installation-level protocol configuration. `active.json`
stores whether Atelier is active. When `active=false`, host-agent behavior is
native and `/plan` remains untouched.

### Epic source of truth

Each active planning effort has its own ledger:

```text
.atelier/epics/<epic-slug>/state.json
```

That file is the authoritative protocol state for the epic. It stores:

- status
- active skill
- current slice
- approval status
- allowed actions
- required artifacts
- slices
- guards and violations

### Source files in the repo

- `src/protocol/schema.ts`
- `src/protocol/state.ts`
- `src/protocol/init.ts`
- `src/protocol/epic.ts`
- `src/protocol/validator.ts`

### Responsibilities

#### `schema.ts`

Defines typed state contracts using Zod:

- config state
- active state
- epic state
- slice state
- approval and allowed action contracts

This is the contract that keeps protocol files consistent.

#### `state.ts`

Handles:

- reading and writing JSON protocol files
- parsing config, active and epic state
- loading the active epic safely

This is the persistence layer.

#### `epic.ts`

Creates a new epic ledger, initializes required artifacts and activates Atelier.

---

## 2. Protocol and gate layer

The protocol is filesystem-native. The CLI does not orchestrate reasoning; it
installs protocol files, mutates explicit state and validates invariants.

Important invariants:

- Atelier is inactive by default.
- `/plan ...` remains native host-agent planning.
- `/atelier quick|plan|deep ...` activates Atelier.
- Project code cannot be edited before approval in Atelier mode.
- Execution operates one approved slice at a time.

Validation is implemented in `src/protocol/validator.ts`.

### Core transitions

Important operations include:

- `startPlannerGoal`
- `autoplanGoal`
- `markCurrentDone`
- `advancePlanner`
- `presentPlannerPlan`
- `approvePlannerPlan`
- `rejectPlannerPlan`
- `executeApprovedPlan`
- `generatePlannerSlices`
- `syncPlannerPhase`

### Runtime design principle

The planner runtime is a **small state machine**, not a large reasoning engine.

Its job is to:

- sequence
- persist
- validate transitions
- keep planning and execution separated

The reasoning itself remains delegated to skills and the host agent.

### Runtime task shape

The runtime's default mental model is:

```text
objective
  -> repo researcher
  -> tech researcher
  -> business researcher
  -> synthesis / planner
  -> plan.md
  -> approval
  -> execution slices
```

The task templates live in `src/state/task-templates.ts`.

The goal classifier currently maps raw goals into these domain templates:

- `migration`
- `new-feature`
- `refactor`
- `infrastructure`
- `research`
- `default`

Each template produces the same structural pattern: three discovery tracks, one
synthesis task, and one decision task. Discovery tracks share a `parallel_group`;
synthesis depends on the discovery tasks; decision depends on synthesis.

---

## 3. CLI layer

### Primary file

- `src/cli.ts`

This defines the public command surface for the framework.

### Planner command handlers

- `src/commands/planner.ts`

This layer turns CLI invocations into calls into the runtime/state layer.

Examples:

- `planner autoplan` -> `autoplanGoal`
- `planner approve` -> `approvePlan`
- `planner execute` -> `executePlan`

### Other command files

- `src/commands/status.ts`
- `src/commands/handoff.ts`
- `src/commands/init.ts`
- `src/commands/install-adapter.ts`
- `src/commands/phase.ts`
- `src/commands/mode.ts`
- `src/commands/return-cmd.ts`
- `src/commands/validate.ts`
- `src/commands/doctor.ts`

### Architectural rule

The CLI should be the **only formal mutation interface** for workflow state.

That gives:

- stable transitions
- cross-agent consistency
- easier debugging
- less hidden behavior

---

## 4. Adapter layer

### Purpose

Adapters translate the framework into repository-local instructions that a host agent can read.

### Source files

- `src/adapters/index.ts`
- `src/adapters/common.ts`
- `src/adapters/claude.ts`
- `src/adapters/cursor.ts`
- `src/adapters/codex.ts`
- `src/adapters/windsurf.ts`
- `src/adapters/cline.ts`
- `src/adapters/kilo.ts`
- `src/adapters/antigravity.ts`
- `src/adapters/generic.ts`

### Role of `common.ts`

This file centralizes the shared planner command protocol.

That means all adapters can present the same mental model:

- `/planner <goal>`
- `/planner present`
- `/planner approve`
- `/planner reject`
- `/planner execute`
- `/planner status`

### Adapter responsibility

Each adapter should:

1. tell the agent to read `.atelier/context.md`
2. explain how to derive the active skill
3. explain how to translate planner commands into CLI commands
4. instruct the agent to re-read context after mutating state

### Important boundary

Adapters are **instruction generators**, not automation runtimes.

They do not execute the planner.
They teach the host agent how to execute the planner.

---

## 5. Skill layer

### Skills location

- `kit/skills/...`

Important planner-related skills:

- `planner`
- `repo-analyst`
- `tech-analyst`
- `business-analyst`
- `implementer`
- `designer`
- `reviewer`

### Skill routing

Routing logic lives in:

- `src/skill-loader.ts`

It decides which skill is active from:

- `phase`
- `workflow`
- `planner_state`
- `current_task`
- `current_slice`

### Key rule

In planner mode:

- approval state prefers the planner skill
- task focus routes by task type
- execution with a current slice routes to implementer

This keeps the runtime and the cognitive behavior aligned.

### Planner task type to skill mapping

| Task type | Skill folder |
|-----------|--------------|
| `repo` | `repo-analyst` |
| `tech` | `tech-analyst` |
| `business` | `business-analyst` |
| `synthesis` | `planner` |
| `decision` | `designer` |
| `implementation` | `implementer` |

This mapping is implemented in `src/skill-loader.ts`.

---

## 6. Artifact layer

Artifacts exist for humans and handoff, not as the only system of record.

### Per-epic artifact bundle

In planner mode, artifacts are organized per-epic under `.atelier/plan/<epic-id>/`:

- `plan.md` — review projection (generated from state)
- `design.md` — architectural decisions and boundaries (filled by decision task)
- `context.md` — snapshot of `.atelier/context.md` for audit trail
- `manifest.json` — plan metadata, versions, and artifact pointers
- `questions.md` — questions formulation
- `research.md` — technical research evidence
- `outline.md` — implementation outline
- `impl-log.md` — implementation progress (during execution)
- `review.md` — human review notes
- `decision-log.md` — decision trail

Each new epic (planning run) uses its own folder with a slug-based name. Repeating the same goal
text appends a numeric suffix (e.g. `my-goal-2`) so old plans are preserved.

### Artifact philosophy

- the **task/slice graph** in `.atelier/context.md` is the runtime truth
- the **plan artifacts** in `.atelier/plan/<epic-id>/` are human-facing summaries and audit trails
- no legacy `.atelier/artifacts/` directory is required for planner operation

This architecture prevents the system from depending entirely on free-form prose while keeping
all discovery and architectural decisions attached to their specific planning runs.

---

## 7. Lifecycle of a planner request

### Step 1 — entry

The user provides:

- a raw goal

The runtime creates:

- one epic
- starter tasks

### Step 2 — planning

The planner progresses:

- repo
- tech
- business
- synthesis
- decision (document architectural boundaries and patterns, fills `design.md`)

### Step 3 — slice generation

After synthesis and decision:

- slices are created (from synthesis output)
- `plan.md` is generated or refreshed

### Step 4 — approval

Planner enters:

- `planner_state=awaiting_approval`
- `approval_status=pending`

### Step 5 — execution

After approval:

- `planner_state=approved`
- then `planner execute`
- then `planner_state=executing`
- first ready slice becomes current focus

### Step 6 — slice completion

As slices finish:

- current slice becomes done
- planner advances to next slice

---

## 8. Why approval is modeled above slice execution

The framework intentionally models approval at the planner/runtime level, not as a special slice status.

That keeps responsibilities clean:

- slice statuses remain operational (`ready`, `executing`, `done`)
- approval lives in planner state
- execution permission is a property of the planner lifecycle

This reduces state duplication and makes the execution gate easier to reason about.

---

## 9. Why `phase` exists internally

The product is planner-first. The runtime keeps a `phase` field as an internal
supporting signal.

That field remains useful for:

- adapter simplicity
- status visibility
- skill routing

In other words:

- **phase** is an internal lens
- **planner state** is the machine state

---

## 10. Current Runtime Properties

- explicit persistent state
- clear separation of runtime vs skill behavior
- CLI-based control plane
- cross-agent adapter strategy
- domain-aware task generation (`src/state/task-templates.ts`)
- parallel discovery tracks modeled in state (`parallel_group` on tasks)
- approval gate with content validation before execution
- `plan.md` includes risk register, dependency map, open questions, and metadata

---

## 11. Current architectural limitations

- autoplan processes tasks sequentially; parallel execution requires an external orchestrator
- there is no dedicated scheduler for multi-agent distributed execution
- domain classification uses keyword matching; complex goals may fall back to the default template
- plan artifact dependency map is text-based, not a rendered graph

---

## 12. Contribution Rules For Maintainers

When evolving the architecture:

### Prefer

- changing state schemas deliberately
- centralizing transitions in `src/state/planner.ts`
- using CLI as the public control surface
- keeping adapters thin and declarative
- keeping skills narrow and role-specific

### Avoid

- embedding planner mutations inside adapters
- making skills mutate state directly outside the CLI/runtime
- duplicating transition logic across command files
- turning artifacts back into the only source of truth

---

## 13. A short architecture sentence

If you need to explain the implementation in one sentence:

> atelier-kit is a CLI-driven planner runtime with persistent state, agent adapters, role-based skills, and approval-gated slice execution.
