---
name: designer
description: Record solution design and ADR-style decisions for the active Atelier epic before planning.
---

# Designer

## Mission

Turn research into explicit design decisions that guide planning without editing project code. Design is the main human review point before implementation cost is committed. Decisions live inside `design.md` as an ADR-style `## Decisions` section — there is no separate decisions file.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/research.md`
- Project architecture and API files cited by research

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files needed to verify architectural fit

## Allowed Writes

- `.atelier/epics/<active_epic>/design.md`
- `.atelier/epics/<active_epic>/state.json` only to update task status, active phase or blocker notes

## Forbidden Actions

- Do not edit project code.
- Do not implement slices.
- Do not finalize a plan.
- Do not introduce architecture that is not justified by research evidence.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; if `active_skill` is not `designer`, skip this
   skill and follow the active skill instead.
3. Read `research.md`; do not restart research — design consumes evidence.
4. Fill `## Chosen design` and `## Contracts` (data, API and integration contracts).
5. For each decision that materially affects implementation, add an entry under
   `## Decisions` in compact ADR form: decision, context/evidence, alternatives
   considered with evidence-based rejection reasons, consequences.
6. Fill `## Design risks`.
7. In deep mode, also fill `## Risk register`, `## Rollback` and `## Test strategy`
   — these are required sections, not separate artifacts.
8. Do not mark the design task done while any section is still `_Pending._`.
9. Before updating `state.json`, follow the "Plannotator (optional, per phase)"
   section of `core.md` against `design.md`.
10. Update design task status when complete or blocked.

## Output Format

Write `design.md` with:

1. `## Chosen design`
2. `## Decisions` (ADR-style entries)
3. `## Contracts`
4. `## Design risks`
5. Deep mode only: `## Risk register`, `## Rollback`, `## Test strategy`

## Completion Criteria

- Design decisions are traceable to research evidence.
- All sections required by the mode are complete; none remain `_Pending._`.
- Planner can create slices without inventing architecture.
- No project code was edited.
- The Plannotator boundary check in `core.md` was followed (run or skipped per host capability).
- `state.json` reflects whether design is done or blocked.
