# atelier-kit planner

This document describes how planner mode works: its state model, task flow,
approval gate, and execution handoff.

Related documents:

- [README.md](./README.md) — entry point and feature summary
- [EXECUTION-FLOW.md](./EXECUTION-FLOW.md) — diagrammed flow from objective to researchers, plan, approval, and slices
- [AGENT-USAGE.md](./AGENT-USAGE.md) — how to use the planner inside Claude, Cursor, Codex, Windsurf, Cline, Kilo, Anti-GRAVITY, and generic agent setups
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal design of state, runtime, adapters, skills, and artifacts

## What the planner is

The planner gives agent work a shared, persistent structure:

1. start from an initial goal
2. run planning and discovery
3. produce a validated execution plan
4. execute approved slices end-to-end

It is built around three primitives:

- **Epic**: the initiative being worked on
- **Task**: a unit of discovery, analysis, decision, or orchestration
- **Slice**: a vertical delivery unit to execute after planning converges

The planner uses `.atelier/context.md` as the authoritative runtime state and
`.atelier/plan/<epic-id>/` as the per-epic artifact bundle, containing:
- `plan.md` — human-readable execution plan
- `design.md` — architectural decisions and boundaries
- `context.md` — snapshot of planning context at the time
- `manifest.json` — metadata and artifact pointers
- plus research, questions, outline, and other discovery artifacts

## What the planner is not

The planner is **not**:

- a project manager
- a sprint board
- a backlog tool
- a document-only process
- an implementation engine that should start coding without approval

It also does not centralize every thought the agent has into long documents.
It stores only the state needed to coordinate work:

- current goal
- current focus
- task graph
- slice graph
- approval state
- execution state

The detailed reasoning still happens inside the specialized agent skills.

## Planner Flow

Planner mode follows this path:

```text
objective
  -> questions
  -> repo / tech researchers (+ business when market research is implied)
  -> synthesis (generate initial slices)
  -> design (document architectural decisions)
  -> plan (render and review)
  -> human approval
  -> execution slices
```

See [EXECUTION-FLOW.md](./EXECUTION-FLOW.md) for the diagrammed version.

### 1. Planning layer

The runtime creates domain-aware task templates from the objective. The default
shape is:

- `repo`
- `tech`
- `business` only when the objective implies market research, competitor benchmarking, pricing, regional, or regulatory discovery
- `synthesis`
- `decision`

These tasks answer questions like:

- What exists in the repo today?
- What external technical constraints apply?
- What market, business, or rollout concerns matter when the objective asks for that discovery?
- How should work be split into execution slices?
- What architectural decisions and boundaries apply to those slices?

The `repo`, `tech`, and optional `business` tasks are discovery tracks. The `synthesis`
task depends on those tracks and converts the evidence into initial slices. The `decision`
task depends on synthesis and documents the architectural boundaries and patterns that apply
to those slices (filling in `design.md`).

### 2. Approval layer

Once planning converges, the planner presents a final plan for review:

- the plan is presented
- slices are proposed
- risks are visible
- the team can approve or reject before coding starts

### 3. Execution layer

After approval, the planner changes role.

It stops being primarily about exploration and becomes an execution coordinator:

- focus first slice
- run implementer
- mark slice done
- move to next slice

At that point, the planner is no longer deciding what the work is. It is sequencing the
execution of already approved slices.

## Why tasks and slices are different

This distinction is fundamental.

### Task

A task is a planning or coordination unit.

Examples:

- map framework coupling
- compare framework options
- identify rollout risk
- synthesize discovery into execution order

Tasks are used to **discover, de-risk, and decide**.

### Slice

A slice is an execution unit.

Examples:

- bootstrap a new PHP service with CI and healthcheck
- migrate authentication end-to-end
- migrate a first user-facing endpoint

Slices are used to **deliver vertical value**.

### Practical rule

- tasks answer: **what do we need to learn or decide?**
- slices answer: **what can we deliver end-to-end next?**

## Parallel discovery tracks

Discovery tasks (repo, tech, and optional business) are modeled as a parallel group in the planner state.
Each of these tasks carries a `parallel_group` identifier that links them as concurrent tracks.

In practice:
- the CLI processes them sequentially in autoplan mode
- an agent that supports parallel tool use can run them simultaneously
- the `plan.md` artifact renders parallel tracks as a labeled group for clarity

The synthesis task has no `parallel_group` — it is sequentially dependent on the discovery tracks that were created for the goal.

## Researcher roles

The researcher roles are implemented as skills and selected from the active task type.

| Task type | Skill | What it does |
|-----------|-------|--------------|
| `repo` | `repo-analyst` | Reads the repository and records concrete code, test, dependency, persistence, and operational facts. |
| `tech` | `tech-analyst` | Gathers external technical evidence: docs, specs, versions, APIs, compatibility, security, and tradeoffs. |
| `business` | `business-analyst` | Clarifies rollout, stakeholders, operational risk, acceptance criteria, and decision constraints. |
| `synthesis` | `planner` | Combines the researcher outputs into ordered slices, dependencies, risks, and acceptance checks. |
| `decision` | `designer` | Documents architectural boundaries, ports, patterns, and design approach needed for the slices. Fills `design.md`. |

This is why tasks are not implementation work. They exist to answer the questions
needed before a safe plan can be approved.

## Why `phase` exists internally

The product is planner-first.

`phase` remains in the runtime only as a small internal routing field because:

- it helps adapters and skills load the right behavior
- it communicates the current operating lens (`plan`, `implement`, `review`, ...)
- it simplifies a few runtime transitions

It should not be treated as part of the public planner interface.

The planner fields to rely on are:

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

## The runtime states

The current planner runtime distinguishes:

### `planner_mode`

- `manual`
- `autoplan`

This describes how the planner is being driven.

### `planner_state`

- `idle`
- `planning`
- `awaiting_approval`
- `approved`
- `executing`

This describes where the planner is in its lifecycle.

### `approval_status`

- `none`
- `pending`
- `approved`
- `rejected`

This describes the human validation state of the plan.

## The intended lifecycle

### A. Manual planner flow

Use this when you want tighter control over each transition.

1. `planner start "<goal>"`
2. advance discovery manually
3. `planner present`
4. `planner approve`
5. `planner execute`

This is useful when:

- the change is sensitive
- planning needs more conversation
- the human wants to review intermediate output closely

### B. Autoplan flow

Use this when you want the planner to run discovery and synthesis automatically until it
reaches a reviewable final plan.

1. `planner autoplan "<goal>"`
2. planner classifies the goal and creates task templates
3. planner runs repo, tech, and optional business researcher tasks
4. planner runs synthesis
5. planner generates slices
6. planner writes `plan.md`
7. planner stops in `awaiting_approval`
8. human approves or rejects
9. if approved: `planner execute`

This is the default high-level flow.

## The artifact strategy

The planner uses two classes of outputs.

### 1. Runtime state

Stored in `.atelier/context.md`.

This is the machine-readable state.

### 2. Human review artifact

Stored per plan in `.atelier/plan/<slug-do-epico>/plan.md`, with a snapshot of runtime state in `context.md` and a small `manifest.json` in the same folder. The same rendered plan is mirrored to `.atelier/artifacts/plan.md` for tools that still expect that path.

This is the plan users read and approve.

If you start another plan with the same goal text, the runtime picks a new folder (e.g. `meu-plano-2`) so previous plan files are not overwritten.

That means:

- the graph is the operational truth
- the markdown plan is the review surface

## How agents fit into the system

The planner does not assume one specific coding agent.

Instead, it assumes:

- the host agent can read repository-local instructions
- the host agent can execute terminal commands
- the host agent can re-read `.atelier/context.md`

The adapters generated by atelier-kit teach each agent the same protocol.

## Shared command protocol

Across Claude, Cursor, Codex, Windsurf, Cline, Kilo, Anti-GRAVITY, and the generic
adapter, the chat commands are the same:

```text
/planner <goal>
/planner present
/planner approve
/planner reject
/planner execute
/planner status
```

The adapter instructs the agent to translate those to CLI calls like:

```bash
atelier-kit planner autoplan "<goal>"
atelier-kit planner present
atelier-kit planner approve
atelier-kit planner reject --reason "..."
atelier-kit planner execute
atelier-kit status
```

The CLI owns state transitions. The agent handles reasoning and implementation.

## Why the CLI matters

All agents should use the CLI for state mutation because it gives:

- consistency across environments
- durable state
- reproducible transitions
- auditability
- easier debugging

Without the CLI, each adapter would need its own state mutation rules.

## The planner's design boundaries

The planner should automatically do:

- initialize planning from a goal
- structure discovery into tasks
- converge into slices
- generate a final plan artifact
- stop for approval
- sequence execution after approval

The planner should not automatically do:

- start implementation before approval
- silently invent architecture after the plan is presented
- bypass the approval gate
- conflate discovery tasks with delivery slices

## Planning Steps

### Step 1 — Normalize the goal

The planner turns a user request into an epic.

Example:

> "migrate Python framework to PHP"

becomes:

- one epic
- initial discovery tasks

### Step 2 — Split discovery by concern

The planner creates independent tracks such as:

- repo
- tech
- business

This keeps repository facts, external constraints, and rollout concerns separate
until synthesis.

### Step 3 — Converge in synthesis

Synthesis is where the planner decides:

- what slices make sense
- what order they should run in
- what dependencies exist
- where the risk is

### Step 4 — Present the final plan

At this point the planner should stop and expose:

- discovery summary
- slice list
- dependencies
- risks
- acceptance criteria

### Step 5 — Execute slices

Only after approval, the planner focuses the first executable slice and lets the
implementer take over.

## What the planner skill does vs what the planner runtime does

### Planner runtime

The runtime is implemented by:

- context state
- planner state transitions
- CLI commands
- adapters

It handles orchestration.

### Planner skill

The planner skill is the agent behavior loaded when planning or synthesis is the active
work mode.

It handles reasoning for planning and synthesis.

## Current limitations

- autoplan progresses sequentially through tasks; true multi-agent parallel execution requires an external orchestrator
- `plan.md` dependency map is text-based, not a rendered graph
- domain classification uses keyword matching; complex or ambiguous goals fall back to the default template

## Recommended usage patterns

### Use manual mode when:

- the problem is ambiguous
- the stakes are high
- you want close control over discovery

### Use autoplan when:

- you want a fast plan draft
- the request is clear enough to structure automatically
- you want the agent to do planning work before you intervene

## Minimal happy-path example

```bash
atelier-kit planner autoplan "Migrate Python framework to PHP"
atelier-kit planner present
atelier-kit planner approve
atelier-kit planner execute
```

And inside an agent session:

```text
/planner migrate Python framework to PHP
/planner approve
/planner execute
```

## Final summary

The planner turns a goal into discovery tasks, proposed execution slices, a
reviewable plan, and then approved slice-by-slice execution.
