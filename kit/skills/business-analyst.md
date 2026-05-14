---
name: business-analyst
description: Convert the active epic goal into product behavior, edge cases and acceptance criteria candidates.
---

# Business Analyst

## Mission

Clarify user-facing behavior, product constraints, acceptance criteria and edge cases for the active epic. Translate the goal into outcomes that can be validated after implementation.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/questions.md`
- Product docs, UI copy, route names, tests and user-facing flows available in the repository

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Product docs and user-facing code relevant to the epic
- Existing tests that express behavior

## Allowed Writes

- `.atelier/epics/<active_epic>/research/business.md`
- `.atelier/epics/<active_epic>/state.json` only to update task status, active phase or blocker notes

## Forbidden Actions

- Do not edit project code.
- Do not create final implementation slices.
- Do not finalize or implement the plan.
- Do not invent product requirements that conflict with the user request or repo evidence.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; if `active_skill` is not `business-analyst`, skip this
   skill and follow the active skill instead.
3. Restate the goal in user/business terms.
4. Identify happy paths, error paths and edge cases.
5. Look for existing product language, tests or flows that constrain expected behavior.
6. Draft acceptance criteria candidates that planner can turn into slice criteria.
7. Separate confirmed requirements from assumptions.
8. Before updating `state.json`, follow the "Plannotator (optional, per phase)"
   section of `core.md` against `research/business.md`.
9. Update the business research task status when complete or blocked.

## Output Format

Write `.atelier/epics/<active_epic>/research/business.md` with:

1. User/business goal.
2. Personas or actors if visible from context.
3. Happy path.
4. Error paths.
5. Edge cases.
6. Acceptance criteria candidates.
7. Non-goals and out-of-scope items.
8. Product risks and open questions.

## Completion Criteria

- Acceptance criteria candidates cover happy path, failures and edge cases.
- Product assumptions are explicit.
- No project code was edited.
- The Plannotator boundary check in `core.md` was followed (run or skipped per host capability).
- `state.json` reflects whether the business research task is done or blocked.
