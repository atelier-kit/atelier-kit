# Atelier-Kit v2 — Architecture

## From v1 to v2

| v1 | v2 |
|---|---|
| CLI orchestrates planning and execution | Agent follows a filesystem-native planning protocol |
| `.atelier/context.md` is the state | `.atelier/epics/<slug>/state.json` is the state |
| Planner-first runtime | Planning protocol, opt-in activation |
| Always active | Inactive by default |

---

## Core Principle

```text
Agent follows a filesystem-native planning protocol.
CLI initializes, validates, diagnoses and renders rules.
```

---

## Source of Truth

```text
.atelier/epics/<epic-slug>/state.json
```

Every state transition is recorded by updating this file. The CLI reads and writes it. The agent reads and writes it per the active skill's instructions.

---

## Module Boundaries

```text
src/
├── protocol/
│   ├── paths.ts       ← path helpers, slugify
│   ├── schema.ts      ← Zod schemas and TypeScript types
│   ├── io.ts          ← read/write atelier.json, active.json, state.json
│   ├── init.ts        ← initAtelierProtocol(), defaultAtelierConfig()
│   └── validator.ts   ← validation checks, gate enforcement, git diff guard
└── commands/
    └── v2/
        ├── init.ts         ← atelier init
        ├── status.ts       ← atelier status
        ├── new.ts          ← atelier new
        ├── validate.ts     ← atelier validate
        ├── doctor.ts       ← atelier doctor
        ├── render-rules.ts ← atelier render-rules
        ├── approve.ts      ← atelier approve / reject
        ├── execute.ts      ← atelier execute / next / done
        └── off.ts          ← atelier pause / off
```

---

## Kit Directory

```text
kit/
├── protocol/
│   ├── workflow.yaml   ← state machine definition
│   ├── gates.yaml      ← gate preconditions
│   ├── modes.yaml      ← mode artifact requirements
│   └── skills.yaml     ← skill registry
├── rules/
│   ├── core.md         ← core activation rule
│   └── adapters/       ← per-agent overlays
├── skills/             ← on-demand agent skill files
└── schemas/            ← JSON schemas for validation
```

`kit/` is shipped with the npm package and copied into `.atelier/` by `atelier init`.

---

## Activation Model

```text
default: native mode (Atelier inactive)

activate:
  - user uses /atelier <mode> <goal>
  - active.json has active=true

deactivate:
  - atelier off
  - atelier pause (preserves epic)
```

---

## Execution Model

```text
plan approved → atelier execute → current_slice = first ready slice
                                → write_project_code = true
                                → active_skill = implementer

agent implements current_slice

atelier done → slice marked done
atelier next → current_slice = next ready slice
             OR status = review (if no more slices)
```

---

## Guard Model

```text
status ∈ {discovery, planning, awaiting_approval}:
  → atelier validate detects project code changes via git diff
  → reports as protocol violations

status = execution AND approval.status = approved:
  → project code changes are allowed
```

---

## Validation Pipeline

```text
atelier validate
  → validateAtelierConfig()      ← Zod parse atelier.json
  → validateActiveState()        ← Zod parse active.json
  → validateEpicState()          ← Zod parse state.json
                                 ← check required artifacts
                                 ← check gate preconditions
                                 ← check git diff (premature code changes)
```
