# Atelier-Kit v2 — Protocol

## Overview

Atelier-Kit v2 is a **filesystem-native planning protocol**.

The agent reads state from `.atelier/` and follows it. The CLI initializes, validates, diagnoses, and renders rules. No runtime server, no MCP, no remote state.

---

## Protocol States

```ts
type AtelierStatus =
  | "native"           // Atelier inactive — normal agent behavior
  | "idle"             // Atelier active, no current work
  | "discovery"        // Questions and research
  | "synthesis"        // Consolidate findings
  | "design"           // Decisions and solution design
  | "planning"         // Build executable slices
  | "awaiting_approval"// Stop and present plan to human
  | "approved"         // Approved but not executing yet
  | "execution"        // Execute current approved slice
  | "review"           // Review and validate
  | "done"             // Epic completed
  | "blocked"          // Waiting for repair or human input
  | "paused";          // Atelier paused
```

### State Rules

| State | Can edit project code? | Description |
|---|---|---|
| `native` | Yes | Atelier inactive |
| `idle` | No | Atelier active, no work |
| `discovery` | No | Questions and research |
| `synthesis` | No | Consolidate findings |
| `design` | No | Decisions and design |
| `planning` | No | Build executable slices |
| `awaiting_approval` | No | Stop and present plan |
| `approved` | No | Approved, not executing yet |
| `execution` | Yes | Execute current approved slice |
| `review` | Partial | Review and validate |
| `done` | No | Epic completed |
| `blocked` | No | Waiting for repair or human |
| `paused` | According to host agent | Atelier paused |

---

## Source of Truth

```text
.atelier/epics/<epic-slug>/state.json
```

This file is the single source of truth for each epic. Never invent state. If it is missing or inconsistent, run `atelier validate` or `atelier doctor`.

---

## Protocol Invariants

1. **Atelier is inactive by default.** `/plan` uses native agent plan mode.
2. **No project code before approval.** `write_project_code=false` until execution.
3. **One slice at a time.** `current_slice` points to the active slice.
4. **Approval is irreversible from the agent.** Only `atelier reject` reverts it.
5. **Skills load on demand.** Only the `active_skill` is loaded per step.

---

## State Transitions

```text
idle → discovery → synthesis → design → planning → awaiting_approval
     → approved → execution → execution (next slice) → review → done
```

Any state can transition to `blocked` or `paused`.

---

## Activation Protocol

When Atelier-Kit is active, the agent:

1. Reads `.atelier/atelier.json`
2. Reads `.atelier/active.json`
3. Reads `.atelier/epics/<active_epic>/state.json`
4. Loads only `.atelier/skills/<active_skill>.md`
5. Follows the skill instructions precisely
6. Updates the corresponding artifact and `state.json` after each step
7. Does not edit project code unless `allowed_actions.write_project_code=true`
8. Stops at `awaiting_approval` and presents `plan.md`
