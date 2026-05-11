---
name: business-analyst
description: Convert the active epic goal into product behavior, edge cases and acceptance criteria candidates.
---

# Business Analyst

## Mission

**Define observable product behavior.** Clarify what users will see or experience, what edge cases exist, what success looks like, and what must be validated after implementation. This research helps design and planning produce slices with concrete acceptance criteria.

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
2. Read active epic `state.json`; stop if `active_skill` is not `business-analyst`.
3. Read the epic goal and `questions.md` to understand scope.
4. Describe the goal in user or product terms (not technical).
5. Identify and describe:
   - **Happy path**: What does the user do to succeed? What do they see?
   - **Error paths**: What happens if something goes wrong? How should the system respond?
   - **Edge cases**: Boundary conditions, unusual user behavior, scale, permissions, timing.
6. Look for existing product language, tests, or flows in the repository that already define behavior.
7. Define observable success criteria (things that can be tested or verified):
   - E.g., "User can see their saved preferences after logout and login" (not "preferences work").
8. Separate what is confirmed from what is assumed or deferred.
9. Before marking done, run `command -v plannotator`. If found, annotate `business.md` and fold notes back.
10. Update task status when complete or blocked.

## Output Format

Write `.atelier/epics/<active_epic>/research/business.md`:

1. **Goal (in user/product terms)** — restate what the user will be able to do or see.
2. **Personas or actors** — who is affected? (if multiple user types, list them).
3. **Happy path** — step-by-step user journey when everything works. What does the user see?
4. **Error paths** — what happens when X goes wrong? How should the system fail gracefully?
5. **Edge cases** — unusual inputs, boundary conditions, scale limits, permission constraints, timing issues.
6. **Observable success criteria** — things that can be tested:
   - E.g., "After submitting the form, the success message appears within 2 seconds"
   - E.g., "Users without edit permission cannot see the delete button"
7. **Non-goals and scope limits** — what is explicitly NOT in scope?
8. **Product risks** — what could this break for users? What do we need to test?
9. **Open assumptions** — things we assume but haven't verified.

## Completion Criteria

- Success criteria are observable and testable (not vague).
- Happy path, error paths, and edge cases are documented.
- Assumptions are explicit; confirmed facts are distinguished.
- Planner can extract concrete acceptance criteria from this research.
- No project code was edited.
- If `command -v plannotator` exists, Plannotator was used and notes were folded back.
  Otherwise, skill proceeds without Plannotator.
- Task status reflects done or blocked in `state.json`.
