# atelier-kit architecture review

This document complements [ARCHITECTURE.md](./ARCHITECTURE.md) with a deeper analysis of:

- the full architecture flow with diagrams
- known architectural risks and their root causes
- how Clean Architecture concepts apply to this codebase

---

## Full architecture flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER INPUT                               │
│               (atelier-kit <command> [args])                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   CLI LAYER  (src/cli.ts)                        │
│          Commander.js — parsing, validation, routing            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ planner  │  │  init    │  │  status  │  │ handoff  │  ...   │
│  └────┬─────┘  └──────────┘  └──────────┘  └──────────┘        │
└───────┼──────────────────────────────────────────────────────────┘
        │  only formal mutation interface for state
        ▼
┌──────────────────────────────────────────────────────────────────┐
│             PLANNER RUNTIME  (src/state/planner.ts)              │
│                                                                  │
│  State machine:                                                  │
│  idle ──► planning ──► awaiting_approval ──► approved ──► executing
│                                                                  │
│  startPlannerGoal()    creates epic + tasks from templates       │
│  autoplanGoal()        full planning cycle                       │
│  markCurrentDone()     advances task/slice, syncs focus          │
│  generateSlices()      creates delivery slices from synthesis    │
│  approvePlan()         gates execution behind human approval     │
│  executePlan()         transitions to executing phase            │
└───────┬─────────────────────────────┬────────────────────────────┘
        │ read/write                  │ uses templates
        ▼                             ▼
┌───────────────────┐   ┌──────────────────────────────────────────┐
│   STATE LAYER     │   │          TASK TEMPLATES                  │
│  src/state/       │   │  src/state/task-templates.ts             │
│                   │   │                                          │
│  schema.ts        │   │  classifyGoal(goal) → DomainKind         │
│  (Zod contracts)  │   │  domains: migration, new-feature,        │
│                   │   │  refactor, infra, research, default      │
│  context.ts       │   │                                          │
│  read/write       │   │  each domain defines tasks for:          │
│  .atelier/        │   │  - repo analysis                         │
│  context.md       │   │  - tech research                         │
│                   │   │  - business analysis                     │
│  atelierrc.ts     │   │  - synthesis                             │
└───────────────────┘   └──────────────────────────────────────────┘
        │
        ▼  (after state mutation)
┌──────────────────────────────────────────────────────────────────┐
│                ADAPTER LAYER  (src/adapters/)                    │
│                                                                  │
│  Instruction generators — teach agents how to use the CLI       │
│                                                                  │
│  claude.ts    ──► CLAUDE.md + .claude/skills/                   │
│  cursor.ts    ──► .cursor/rules/atelier-core.mdc                │
│  codex.ts     ──► AGENTS.md                                     │
│  windsurf.ts  ──► .windsurfrules                                │
│  cline.ts     ──► .clinerules/atelier-core.md                   │
│  generic.ts   ──► fallback instructions                         │
│                                                                  │
│  common.ts    ──► shared /planner command protocol              │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SKILL LAYER  (kit/skills/)                      │
│             src/skill-loader.ts (routing logic)                 │
│                                                                  │
│  planner state → skill routing:                                  │
│                                                                  │
│  awaiting_approval ──────────────────► planner/                 │
│  current_task.type=repo ─────────────► repo-analyst/            │
│  current_task.type=tech ─────────────► tech-analyst/            │
│  current_task.type=business ─────────► business-analyst/        │
│  current_task.type=synthesis ────────► planner/                 │
│  current_slice + executing ───────────► implementer/            │
│  phase=questions ─────────────────────► questions/              │
│  phase=research ──────────────────────► researcher/             │
│  phase=design ────────────────────────► designer/               │
│  phase=review ────────────────────────► reviewer/               │
└──────────────────────────────┬───────────────────────────────────┘
                               │ skills produce
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│             ARTIFACTS LAYER  (.atelier/artifacts/)               │
│                                                                  │
│  questions.md  research.md  design.md  outline.md               │
│  plan.md       impl-log.md  review.md                           │
│                                                                  │
│  human-readable projections of runtime state                    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                 GATES LAYER  (src/gates/)                        │
│            quality validation checkpoints per phase             │
│                                                                  │
│  questions → research → design → plan → implement → review      │
│                                                                  │
│  atelier-kit doctor    runs all gates                           │
│  atelier-kit validate  runs a specific gate                     │
└──────────────────────────────────────────────────────────────────┘
```

### Planner state machine

```
  /planner start <goal>
       │
       ▼
  ┌─────────┐   autoplan / tasks done   ┌───────────────────┐
  │  idle   │ ────────────────────────► │    planning        │
  └─────────┘                           │  (tasks running)   │
                                        └────────┬───────────┘
                                                 │ synthesis done
                                                 ▼
                                   ┌─────────────────────────┐
                                   │    awaiting_approval     │
                                   │  plan.md generated,     │
                                   │  waiting for human      │
                                   └──────────┬──────────────┘
                                              │
                             ┌────────────────┴────────────┐
                             ▼                             ▼
                       ┌──────────┐               ┌───────────────┐
                       │ approved │               │   rejected    │
                       └────┬─────┘               │ (back to      │
                            │                     │  planning)    │
                            ▼                     └───────────────┘
                       ┌──────────┐
                       │executing │
                       │ (slices) │
                       └────┬─────┘
                            │ all slices done
                            ▼
                         ┌──────┐
                         │ done │
                         └──────┘
```

---

## Architectural risks: deeper analysis

The three limitations listed in ARCHITECTURE.md section 11 warrant deeper analysis
because each has root causes that compound over time.

### 1. Domain classification via keyword matching

**Current behavior:** `classifyGoal(goal)` in `src/state/task-templates.ts` uses
keyword pattern matching to decide which discovery task set to generate.

**Root cause:** The classifier is embedded directly inside `startPlannerGoal()`.
There is no interface boundary between "decide what kind of goal this is" and
"create tasks for that kind of goal."

**What breaks in practice:**
- Goals phrased in unexpected language (other languages, domain jargon, compound objectives)
  silently fall back to the `default` template
- The wrong domain template changes which analysts are invoked (repo/tech/business),
  affecting the entire discovery phase with no warning to the agent or user
- Adding a new domain type requires modifying `task-templates.ts` and then also
  finding every caller that may have encoded assumptions about domain kinds

**Evolution path:**
Extract a `IGoalClassifier` interface at the use case boundary. The keyword
classifier becomes the default implementation. A future LLM-backed or embedding-based
classifier can replace it without touching planning logic.

```
today:   startPlannerGoal() → classifyGoal() → task-templates.ts  [coupled]
evolved: startPlannerGoal() → IGoalClassifier.classify()           [decoupled]
                                   └── KeywordClassifier (current default)
                                   └── SemanticClassifier (future option)
```

---

### 2. No scheduler for parallel slice execution

**Current behavior:** `parallel_group` on tasks and slices models the *intent*
of concurrency but there is no runtime that acts on it. `markCurrentDone()` advances
one slice at a time and the agent must call `atelier-kit next` manually.

**Root cause:** The dependency resolution in `isTaskReady()` is a point-in-time
check, not a graph traversal. Without a resolved dependency order, there is no
safe way to identify which slices are concurrently executable.

**What breaks in practice:**
```
Epic with 3 independent slices:

  today:    [Slice A] done → [Slice B] done → [Slice C] done   (serial)

  intent:   [Slice A ──────────────────]
            [Slice B ─────────────── ]                          (parallel)
            [Slice C ──────────────────────]
```

Parallel work that could be delegated to multiple agents or sessions
is unnecessarily serialized. The `parallel_group` metadata never influences
actual execution order.

**Evolution path:**
A `ScheduleExecution` use case could resolve the dependency graph and return
a set of "currently executable" slices. The existing serial behavior becomes
`SerialScheduler` (default). A future multi-agent scheduler returns multiple
ready slices simultaneously.

This change does not require modifying the state schema — `parallel_group` is
already modeled. It only requires promoting the scheduler from implicit (CLI loop)
to an explicit domain service.

---

### 3. Dependency map is not a computable graph

**Current behavior:** `depends_on` on `Task` and `Slice` stores string ID arrays.
`isTaskReady()` checks if referenced IDs have `status=done`. There is no DAG
(directed acyclic graph) constructed from these relationships.

**Root cause:** Dependencies were designed as metadata for humans reading `plan.md`,
not as a structure the runtime reasons over.

**What breaks in practice:**
- Circular dependencies are not detected at creation time:
  ```yaml
  tasks:
    - id: task-1
      depends_on: [task-2]
    - id: task-2
      depends_on: [task-1]   # silent deadlock
  ```
- References to non-existent IDs produce false `isTaskReady=false` with no diagnostic
- There is no critical path calculation (which tasks block the most downstream work?)
- Topological execution order is implicit in insertion order, not computed from the graph

**Evolution path:**
A `DependencyGraph` domain service could be built from the existing `depends_on`
arrays. It would:
- detect cycles at insertion time
- compute topological order for scheduling
- expose "ready now" vs "blocked" task sets

This is purely additive — existing schema stays unchanged. The graph becomes
a computed view over the same data already stored in state.

```typescript
// src/domain/DependencyGraph.ts  (sketch)
class DependencyGraph {
  addNode(id: string, deps: string[]): void
  hasCycle(): boolean
  topologicalOrder(): string[]
  readyNodes(doneIds: Set<string>): string[]
}
```

The three risks are connected: a better classifier enables correct domain templates,
a computable graph enables safe scheduling, and a scheduler can only work correctly
once the graph is resolved. The evolution path is: graph first, scheduler second,
classifier as an independent improvement.

---

## Clean Architecture mapping

The current layering already reflects strong architectural instincts. Clean
Architecture would formalize two things the codebase does informally: dependency
direction and port abstractions at layer boundaries.

### Current mapping

```
CLEAN ARCHITECTURE          ATELIER-KIT TODAY
──────────────────          ─────────────────────────────────────────
Entities                ←→  schema.ts (Zod: Epic, Task, Slice, etc.)
                             close, but domain types are coupled to Zod

Use Cases               ←→  planner.ts (state machine, transitions)
                             violation: reads/writes files directly

Interface Adapters      ←→  src/commands/ (CLI handlers)
                             ok, but mixes input parsing with orchestration

Frameworks & Drivers    ←→  src/adapters/ + gray-matter + Commander.js
                             well-positioned, but no port interfaces defined
```

### Where the dependency rule breaks today

```
CURRENT (with leakage):

planner.ts (Use Case)
    │
    ├──► context.ts ──► gray-matter ──► .atelier/context.md  ← infra inside core
    │
    └──► task-templates.ts  ← pure, no I/O, correct

CLEAN ARCHITECTURE target:

planner.ts (Use Case)
    │
    └──► IContextRepository (Port)
              │
              └── FileContextRepository ──► gray-matter ──► filesystem
```

### What to change

**1. Extract `IContextRepository`**
Interface that isolates `readContext` / `writeContext` from use cases.
- `src/ports/IContextRepository.ts`
- `src/infra/FileContextRepository.ts` (current `context.ts` becomes this)

**2. Extract `IGoalClassifier`**
Addresses risk #1 above.
- `src/ports/IGoalClassifier.ts`
- `src/infra/KeywordClassifier.ts` (current `classifyGoal` becomes this)

**3. Introduce `DependencyGraph` as a domain service**
Addresses risks #2 and #3 above. Lives in domain layer, no I/O.
- `src/domain/DependencyGraph.ts`

**4. Extract `IAgentAdapter`**
The `src/adapters/` files already behave like framework drivers.
A shared interface would make them formally swappable.
- `src/ports/IAgentAdapter.ts`

**5. CLI commands as pure controllers**
Today `src/commands/planner.ts` mixes input parsing with use case orchestration.
Split:
- controller: translates CLI args to use case input DTOs
- use case: executes pure domain logic

### What stays exactly as-is

- The planner state machine is already core domain logic — correct position
- The approval gate is a domain rule, not infrastructure — correct position
- Skill routing acts as a policy decision — belongs in use case layer
- The artifact layer is a presenter/projection — correct position
- Gates are validators — belong at the interface adapter boundary

### Proposed layer diagram under Clean Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                      DOMAIN (Entities)                        │
│  Epic, Task, Slice, PlannerState, Workflow, Mode              │
│  DependencyGraph (domain service)                             │
│  Pure TypeScript types — no I/O, no frameworks               │
│  src/domain/                                                  │
└─────────────────────────────┬─────────────────────────────────┘
                              │ uses
┌─────────────────────────────▼─────────────────────────────────┐
│                       USE CASES                               │
│  StartPlannerGoal, AutoplanGoal, MarkCurrentDone              │
│  ApprovePlan, RejectPlan, ExecutePlan, GenerateSlices         │
│  src/usecases/                                                │
│  dependencies: Domain + Ports only                            │
└─────────┬──────────────────────────┬──────────────────────────┘
          │ via interface             │ via interface
          ▼                           ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│  PORTS (Interfaces)  │  │        INTERFACE ADAPTERS            │
│  src/ports/          │  │                                      │
│                      │  │  Controllers: src/commands/          │
│  IContextRepository  │  │    CLI args → Use Case input DTOs    │
│  IGoalClassifier     │  │                                      │
│  IAgentAdapter       │  │  Presenters: colored status output   │
│  IAgentScheduler     │  │                                      │
└──────────┬───────────┘  │  Gateways: skill-loader.ts          │
           │ implemented  └──────────────────────────────────────┘
           ▼
┌───────────────────────────────────────────────────────────────┐
│               FRAMEWORKS & DRIVERS (Infra)                    │
│                                                               │
│  FileContextRepository   (gray-matter + .atelier/context.md)  │
│  KeywordClassifier       (current classifyGoal)               │
│  AgentAdapters           (claude.ts, cursor.ts, ...)          │
│  CLI                     (Commander.js)                       │
│  Config                  (.atelierrc, paths.ts)               │
└───────────────────────────────────────────────────────────────┘
```

### Concrete benefit table

| Problem today | Root cause | With Clean Architecture |
|---------------|-----------|------------------------|
| `planner.ts` depends on gray-matter indirectly | I/O in use case | Use cases are pure, no disk access |
| Tests require real temp directories | No repository port | Use case tests mock `IContextRepository` |
| Swapping storage (e.g. SQLite) breaks `planner.ts` | No persistence interface | Only swap `FileContextRepository` |
| `classifyGoal` fails on ambiguous goals | Classifier embedded in UC | `IGoalClassifier` → swappable |
| Circular task dependencies not detected | No graph model | `DependencyGraph.hasCycle()` at creation |
| `parallel_group` never influences execution | No scheduler | `IAgentScheduler` with serial default |
| Agent adapters have hardcoded paths | No adapter interface | `IAgentAdapter` formalizes contract |

---

## Summary

The idea behind atelier-kit is sound and the architectural instincts are correct.
The layering is intentional, the CLI-as-control-plane principle is enforced, and
the approval gate is well-modeled as domain logic.

The three limitations from ARCHITECTURE.md section 11 — keyword classification,
serial execution, and text-based dependency maps — share a common root: each is a
concern that was embedded in the planner runtime rather than isolated behind an
interface. Extracting those concerns follows naturally from applying Clean
Architecture's dependency rule.

The refactor path is incremental:

1. Extract `IContextRepository` → enables pure use case testing without disk
2. Extract `DependencyGraph` as domain service → enables cycle detection and scheduling readiness
3. Extract `IGoalClassifier` → enables semantic classification as a drop-in
4. Add `IAgentScheduler` → enables parallel slice execution once graph is solid

None of these changes require rewriting the state machine, approval gate, skill
routing, or adapter layer. The domain logic is already correct. The work is
formalizing the boundaries that informally exist.
