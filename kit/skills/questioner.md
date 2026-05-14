---
name: questioner
description: Create the first project-specific questions for the active Atelier epic before research starts.
---

# Questioner

## Mission

Turn the user's goal into concrete investigation questions before repository or technical research begins. The questioner creates the first real planning artifact: `questions.md`.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- User goal from the active epic
- A shallow repository scan when needed to avoid generic questions

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- Repository root files and high-level docs/config needed to frame questions

## Allowed Writes

- `.atelier/epics/<active_epic>/questions.md`
- `.atelier/epics/<active_epic>/state.json` only to update question task status

## Forbidden Actions

- Do not edit project code.
- Do not perform deep research.
- Do not decide architecture.
- Do not create implementation slices.
- Do not implement a plan.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; if `active_skill` is not `questioner`, skip this
   skill and follow the active skill instead.
3. Read the epic title and goal.
4. Do a shallow scan only when needed to make questions project-specific.
5. Replace generic placeholder questions with concrete questions for this project.
6. Group questions by category: scope, architecture, data, auth, deploy, tests, risks and product impact.
7. Mark critical questions that block planning.
8. If no open questions remain, write an explicit `## No Open Questions` section with the reason.
9. Do not mark the questions task done while `questions.md` is still generic.
10. Before updating `state.json`, follow the "Plannotator (optional, per phase)"
    section of `core.md` against `questions.md`.

## Output Format

Write `.atelier/epics/<active_epic>/questions.md` with:

1. Goal recap.
2. Critical planning questions.
3. Non-blocking questions.
4. Assumptions that can be validated during research.
5. Questions deferred to repo, tech, business or design work.

## Completion Criteria

- `questions.md` contains project-specific questions or an explicit no-open-questions section.
- Critical unknowns are visible before research starts.
- No project code was edited.
- The Plannotator boundary check in `core.md` was followed (run or skipped per host capability).
- The questions task is marked done in `state.json`; `atelier done` is only an optional helper.
