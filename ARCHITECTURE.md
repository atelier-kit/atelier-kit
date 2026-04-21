# atelier-kit architecture

This document explains the internal architecture of the framework.

It is meant for maintainers and contributors who want to understand:

- where state lives
- how planner transitions work
- how CLI commands map to runtime behavior
- how adapters, skills, and artifacts fit together

For the conceptual explanation of the planner, read [PLANNER.md](./PLANNER.md).  
For day-to-day usage by host agents, read [AGENT-USAGE.md](./AGENT-USAGE.md).

## Architectural summary

atelier-kit is organized around five layers:

1. **State layer**
2. **Runtime/orchestration layer**
3. **CLI layer**
4. **Adapter layer**
5. **Skill and artifact layer**

These layers are intentionally separate.

### Why this matters

The framework works because:

- runtime state is explicit and persistent
- transitions are centralized
- the CLI is the mutation interface
- adapters expose the same protocol across hosts
- skills remain small and role-specific

---

## 1. State layer

### Primary file

- `.atelier/context.md`

This is the authoritative state file for a session.

It stores:

- `workflow`
- `planner_mode`
- `planner_state`
- `approval_status`
- `approval_reason`
- `phase`
- `current_epic`
- `current_task`
- `current_slice`
- `epics[]`
- `tasks[]`
- `slices[]`
- `returns[]`

### Source files in the repo

- `src/state/schema.ts`
- `src/state/context.ts`
- `src/state/planner.ts`

### Responsibilities

#### `schema.ts`

Defines typed state contracts using Zod:

- runtime enums
- planner state enums
- entity schemas
- context schema

This is the contract that keeps all other layers consistent.

#### `context.ts`

Handles:

- reading `.atelier/context.md`
- parsing frontmatter
- writing updated state
- default context initialization

This is the persistence layer.

#### `planner.ts`

Implements planner state transitions and orchestration logic.

This file is the effective runtime kernel for planner mode.

---

## 2. Planner runtime layer

The planner runtime is implemented in:

- `src/state/planner.ts`

It is responsible for:

- creating planning structures from a goal
- progressing tasks
- generating slices
- moving to approval
- blocking execution before approval
- entering execution after approval
- writing `plan.md`

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

---

## 6. Artifact layer

Artifacts exist for humans and handoff, not as the only system of record.

### Primary artifacts

- `.atelier/artifacts/questions.md`
- `.atelier/artifacts/research.md`
- `.atelier/artifacts/design.md`
- `.atelier/artifacts/outline.md`
- `.atelier/artifacts/plan.md`
- `.atelier/artifacts/impl-log.md`
- `.atelier/artifacts/review.md`

### Planner-specific artifact

- `plan.md`

In planner mode, `plan.md` is a **review projection** generated from state.

That means:

- the task/slice graph is the runtime truth
- `plan.md` is the human-facing summary

This architecture prevents the system from depending entirely on free-form prose.

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

### Step 3 — slice generation

After synthesis:

- slices are created
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

## 9. Why phases were preserved

Even though planner mode uses richer state, `phase` still exists for:

- backward compatibility
- adapter simplicity
- status visibility
- legacy phased workflows

In other words:

- **phase** is a lens
- **planner state** is the machine state

---

## 10. Current architectural strengths

- explicit persistent state
- clear separation of runtime vs skill behavior
- CLI-based control plane
- cross-agent adapter strategy
- approval gate between planning and implementation
- planner docs and operating docs now aligned

---

## 11. Current architectural limitations

- runtime planning tracks are starter templates, not domain-aware planners
- autoplan is deterministic, not true parallel orchestration
- there is no dedicated scheduler for multi-agent distributed execution
- plan artifact generation is summary-oriented rather than highly structured

These are normal evolution points, not architecture failures.

---

## 12. Good contribution rules for maintainers

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

