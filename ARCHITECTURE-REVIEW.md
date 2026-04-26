# atelier-kit — clean architecture implementation plan

This document is an executable plan for incrementally applying Clean Architecture
principles to the atelier-kit codebase.

It is organized as a sequence of steps that can be reviewed, approved, and executed
independently. Each step is self-contained and leaves the test suite green.

---

## Context

The current architecture has correct instincts — explicit layering, CLI as control
plane, approval-gated execution — but three structural problems compound over time:

1. **Persistence I/O is embedded in use case logic.** `planner.ts` calls `readContext`
   and `writeContext` directly, making it impossible to unit-test without writing real files.

2. **Goal classification is hardcoded and untestable in isolation.** `classifyGoal()`
   in `task-templates.ts` is a static keyword matcher embedded directly inside the
   planning use case. Swapping it or extending it requires touching core logic.

3. **Dependencies between tasks have no computable model.** `depends_on` stores IDs
   but no DAG is built from them. Circular dependencies are invisible. Parallel
   scheduling requires topological order, which cannot be derived from the current model.

These three are addressed in the steps below, in order of increasing complexity.

---

## Step 1 — Extract `IContextRepository` port

**Files:**
- `src/ports/context-repository.ts` ← new
- `src/state/context.ts` ← implement the interface

**What changes:**
Define a typed interface that decouples use case logic from gray-matter and the
filesystem. `context.ts` implements it. `planner.ts` receives it via parameter injection
at the `mutatePlannerState` boundary.

**Why this order first:**
Every state mutation in the system flows through `mutatePlannerState`. Putting an
interface there unlocks pure in-memory testing of all planning logic without temp dirs.

---

## Step 2 — Extract `IGoalClassifier` port

**Files:**
- `src/ports/goal-classifier.ts` ← new
- `src/state/task-templates.ts` ← implement the interface, export default classifier

**What changes:**
Define a typed interface `IGoalClassifier`. The existing keyword matcher becomes the
default implementation. `planner.ts` receives the classifier via the same injection
point as the repository.

**Why this helps:**
A future semantic/LLM classifier becomes a drop-in. The keyword matcher becomes
independently testable without needing a full planner context.

---

## Step 3 — Add `DependencyGraph` domain service

**Files:**
- `src/domain/dependency-graph.ts` ← new

**What changes:**
A pure TypeScript class (no I/O) that builds a directed acyclic graph from
`depends_on` arrays. Provides:
- `hasCycle()` — detect circular dependencies at creation time
- `topologicalOrder()` — safe execution order
- `readyNodes(doneIds)` — nodes whose dependencies are all satisfied

**Why this is additive only:**
No existing code is modified. The graph is a new domain service that callers can
opt into. Future scheduling logic and plan validation can build on it.

---

## Step 4 — Wire ports into `planner.ts`

**Files:**
- `src/state/planner.ts` ← modify `mutatePlannerState` signature

**What changes:**
`mutatePlannerState(cwd, mutate, repo?)` accepts an optional `IContextRepository`.
Default is `FileContextRepository` (the current implementation). All internal calls
pass the repo through, keeping backward compatibility.

`startPlannerGoal` and `autoplanGoal` accept an optional `IGoalClassifier`.
Default is `KeywordClassifier`.

---

## Step 5 — Update tests

**Files:**
- `test/planner.test.ts` ← add in-memory tests
- `test/dependency-graph.test.ts` ← new

**What changes:**
- New `InMemoryContextRepository` test double used in selected tests — no temp dirs.
- Full test suite for `DependencyGraph` (cycle detection, topological order, readyNodes).
- Existing file-based tests remain unchanged (they validate real I/O end-to-end).

---

## Architecture after all steps

```
src/
├── domain/
│   └── dependency-graph.ts      ← pure, no I/O (new)
├── ports/
│   ├── context-repository.ts    ← IContextRepository (new)
│   └── goal-classifier.ts       ← IGoalClassifier (new)
├── state/
│   ├── context.ts               ← implements IContextRepository (modified)
│   ├── planner.ts               ← injects IContextRepository + IGoalClassifier (modified)
│   ├── schema.ts                ← unchanged
│   └── task-templates.ts        ← implements IGoalClassifier (modified)
└── ...rest unchanged
```

Layer dependency direction (nothing below may import from above):

```
domain  ←  ports  ←  state/planner  ←  commands  ←  cli
```

---

## What is NOT changing

- The planner state machine transitions
- The approval gate model
- Skill routing in `skill-loader.ts`
- Adapter layer (`src/adapters/`)
- Gates layer (`src/gates/`)
- CLI command surface (`src/commands/`, `src/cli.ts`)
- Artifact rendering (`renderPlan`, `writePlannerPlanArtifact`)
- The `.atelier/context.md` file format

---

## Verification

After each step:

```bash
pnpm test          # all tests green
pnpm build         # dist/ compiles without errors
```

End-to-end smoke test after step 4:

```bash
mkdir /tmp/atk-test && cd /tmp/atk-test && git init
atelier-kit init
atelier-kit planner autoplan "add user authentication"
atelier-kit status
```
