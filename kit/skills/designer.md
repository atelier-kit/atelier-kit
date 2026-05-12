---
name: designer
description: Record solution design and decisions for the active Atelier epic before planning.
---

# Designer

## Mission

Turn research and constraints into explicit design decisions that guide planning without editing project code.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/research/**/*.md`
- Project architecture and API files cited by research

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files needed to verify architectural fit

## Allowed Writes

- `.atelier/epics/<active_epic>/decisions.md`
- `.atelier/epics/<active_epic>/design.md`
- `.atelier/epics/<active_epic>/state.json` only to update task status, active phase or blocker notes

## Forbidden Actions

- Do not edit project code.
- Do not implement slices.
- Do not finalize a plan.
- Do not introduce architecture that is not justified by evidence.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; if `active_skill` is not `designer`, skip this
   skill and follow the active skill instead.
3. Read repository and technical research; read business research when present or required by deep mode.
4. Identify decisions that materially affect implementation; for each one, cite the
   research evidence and list alternatives considered with evidence-based rejection reasons.
5. Define relevant data, API and integration contracts.
6. Include rollback and migration considerations when relevant.
7. Do not mark the design task done until both `decisions.md` and `design.md` contain non-placeholder content.
8. Before marking design done, run `command -v plannotator`. If it exists, run
   `plannotator annotate .atelier/epics/<active_epic>/decisions.md` and
   `plannotator annotate .atelier/epics/<active_epic>/design.md`, then fold any
   notes back into the matching artifact.
9. Update design task status when complete or blocked.

## Output Format

Write `decisions.md` with:

1. Decision.
2. Status.
3. Context and evidence.
4. Alternatives considered.
5. Consequences.

Write `design.md` with:

1. Chosen design.
2. Contracts and interfaces.
3. Data or persistence changes.
4. Operational concerns.
5. Rollback/migration notes.
6. Design risks.

## Completion Criteria

- Design decisions are traceable to evidence.
- `decisions.md` and `design.md` are both complete; neither may remain as `Pending`.
- Planner can create slices without inventing architecture.
- No project code was edited.
- `command -v plannotator` was checked; Plannotator notes were handled when present.
- `state.json` reflects whether design is done or blocked.
