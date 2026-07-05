---
name: bootstrap
description: Create an Atelier epic ledger and stub artifacts entirely from files, with no CLI.
---

# Bootstrap

## Mission

Activate Atelier for a new epic **without running any CLI command**. When the user
says `/atelier quick <goal>`, `/atelier plan <goal>`, `/atelier deep <goal>`, or
asks to use Atelier-Kit, create the epic ledger and stub artifacts by writing
files directly, then hand control to the first skill via `state.json`.

This skill runs only at activation, when no epic is active yet. After it finishes,
the normal file-based loop in `core.md` takes over.

## Allowed Writes

- `.atelier/active.json`
- `.atelier/epics/<slug>/state.json`
- `.atelier/epics/<slug>/` stub artifacts for the mode

## Steps

1. **Confirm activation.** Only bootstrap on an explicit cue (`/atelier ...`, "use
   Atelier-Kit"). Otherwise do nothing.
2. **Pick the mode**: `quick` (`/atelier quick`), `standard` (`/atelier plan`), or
   `deep` (`/atelier deep`). Default to `standard` if unclear.
3. **Slug** the goal: lowercase, non-alphanumerics to `-`, trim leading/trailing
   `-`, max 80 chars. If `.atelier/epics/<slug>/` already exists, append `-2`,
   `-3`, … until unique.
4. **Baseline**: use the current HEAD commit sha (e.g. from `git rev-parse HEAD`)
   as `guards.baseline_ref`, or the literal string `HEAD` if git is unavailable.
5. **Write `.atelier/epics/<slug>/state.json`** using the skeleton below with the
   mode row filled in.
6. **Write the stub artifacts** for the mode (see Stubs).
7. **Write `.atelier/active.json`** using the active skeleton below.
8. Stop. The first skill named by `active_skill` now owns the work; follow
   `core.md`.

## `state.json` skeleton

```json
{
  "version": 2,
  "epic_id": "<slug>",
  "title": "<goal>",
  "goal": "<goal>",
  "mode": "<mode>",
  "status": "<status>",
  "active_skill": "<skill>",
  "current_slice": null,
  "approval": { "status": "none", "approved_by": null, "approved_at": null, "notes": null },
  "allowed_actions": { "read_project_code": true, "write_project_code": false, "write_atelier_files": true, "run_tests": false },
  "required_artifacts": [<required_artifacts>],
  "tasks": [<tasks>],
  "slices": [],
  "guards": { "baseline_ref": "<baseline>", "allowed_pre_planned_paths": [".atelier/**"] },
  "violations": []
}
```

Per-mode fill-ins:

| mode | status | active_skill | required_artifacts | tasks (`id`/`type`/`artifact`, all `status:"pending"`) |
|---|---|---|---|---|
| quick | `planning` | `planner` | `"plan.md","review.md"` | `plan`/`planning`/`plan.md` |
| standard | `discovery` | `questioner` | `"research.md","plan.md","review.md"` | `questions`/`questions`/`research.md`, `research`/`research`/`research.md`, `plan`/`planning`/`plan.md` |
| deep | `discovery` | `questioner` | `"research.md","design.md","plan.md","review.md"` | `questions`/`questions`/`research.md`, `research`/`research`/`research.md`, `design`/`design`/`design.md`, `plan`/`planning`/`plan.md` |

## `active.json` skeleton

```json
{
  "active": true,
  "mode": "atelier",
  "active_epic": "<slug>",
  "active_phase": "<status>",
  "active_skill": "<skill>",
  "updated_at": "<iso-8601 timestamp>"
}
```

## Stubs

Create each required artifact with its headings and a `_Pending._` placeholder
under each section. The owning skill fills them in later.

- **`research.md`** (standard/deep). Headings in order: `## Questions`,
  `## Codebase`, `## Constraints`, `## Product behavior` (deep only),
  `## What exists vs what will be created`, `## Open unknowns`. Seed `## Questions`
  with:
  - `- [codebase] Which existing files and patterns constrain this work?`
  - `- [constraints] Which framework or dependency constraints need verification?`
  - `- [product] What user-visible outcomes and edge cases define success?`
- **`design.md`** (deep). Headings: `## Chosen design`, `## Decisions`,
  `## Contracts`, `## Design risks`, `## Risk register`, `## Rollback`,
  `## Test strategy`.
- **`plan.md`** (all modes). Headings: `## Goal`, `## Mode`,
  `## Research Notes` (quick only), `## Evidence Summary`, `## Assumptions`,
  `## Risks`, `## Slices`, `## Progress`, `## Native Implementation`.
- **`review.md`** is written later by the reviewer skill, not at bootstrap.

## Completion Criteria

- `.atelier/epics/<slug>/state.json` is schema-valid and matches the mode row.
- `.atelier/active.json` has `active: true` pointing at the new epic.
- Stub artifacts for the mode exist with the required headings.
- No CLI command was required.
