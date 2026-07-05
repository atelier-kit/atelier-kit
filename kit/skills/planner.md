---
name: planner
description: Transform active epic evidence into a living, native-agent implementation plan.
---

# Planner

## Mission

Transform available evidence into a native-agent implementation plan with reviewable slices, allowed file scope, acceptance criteria and validation steps. The planner prepares work for native implementation; it does not implement. `plan.md` is a **living artifact**: it is the contract before implementation and the progress ledger during it.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/research.md` (standard/deep)
- `.atelier/epics/<active_epic>/design.md` (when scheduled)

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files referenced by research/design evidence

## Allowed Writes

- `.atelier/epics/<active_epic>/plan.md`
- `.atelier/epics/<active_epic>/state.json`

## Forbidden Actions

- Do not edit project code.
- Do not implement slices.
- Do not bypass missing evidence; mark assumptions and risks.
- Do not add unrelated feature ideas.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; if `active_skill` is not `planner`, skip this
   skill and follow the active skill instead.
3. Confirm project code writes are disabled.
4. In quick mode, fill `## Research Notes` in `plan.md` yourself: the files,
   symbols and constraints that ground the plan, stating what exists vs what
   will be created. In standard/deep modes, consume `research.md` (it must pass
   `atelier validate --gate research-ready`) and `design.md` when scheduled.
5. In deep mode, do not start final planning until `design.md` is complete.
   If it is not, stop and block with a clear reason.
6. Summarize the load-bearing evidence in `## Evidence Summary` — a condensation,
   not a new research pass.
7. Create vertical slices that produce end-to-end value. Each slice must have `id`,
   `title`, `goal`, `depends_on`, `allowed_files`, `acceptance_criteria` and `validation`.
8. Keep slices small enough for one agent iteration.
9. Reflect the same slices in `state.json` and `plan.md`.
10. Before updating `state.json` to `planned`, follow the "Plannotator (optional,
    per phase)" section of `core.md` against `plan.md`.
11. Set `status` to `planned` and `active_skill` to `null` only when the plan passes
    `atelier validate --gate plan-ready`.
12. During native implementation, the plan stays alive: progress per slice is
    recorded under `## Progress` and the native mirror is re-exported when the
    plan changes.

## Output Format

Write `.atelier/epics/<active_epic>/plan.md` with:

1. `# Plan: <Epic Title>`
2. `## Goal`
3. `## Mode`
4. `## Research Notes` (quick mode only)
5. `## Evidence Summary`
6. `## Assumptions`
7. `## Risks`
8. `## Slices`
9. `## Progress`
10. `## Native Implementation`

Each slice section must include:

- `**Goal:**`
- `**Allowed files:**`
- `**Acceptance criteria:**`
- `**Validation:**`

## Completion Criteria

- `plan.md` passes `atelier validate --gate plan-ready`.
- `state.json` has at least one ready slice.
- Every slice has allowed files, acceptance criteria and validation.
- The Plannotator boundary check in `core.md` was followed (run or skipped per host capability).
- No project code was edited.
