---
name: questioner
description: Write the project-specific questions that open research.md before evidence gathering starts.
---

# Questioner

## Mission

Turn the user's goal into concrete investigation questions before research begins. Questions come before evidence: they are the filter that keeps research focused. The questioner owns only the `## Questions` section of `research.md`.

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

- `.atelier/epics/<active_epic>/research.md` — **only the `## Questions` section**
- `.atelier/epics/<active_epic>/state.json` only to update question task status

## Forbidden Actions

- Do not edit project code.
- Do not perform deep research or fill the evidence sections of `research.md`.
- Do not decide architecture.
- Do not create implementation slices.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; if `active_skill` is not `questioner`, skip this
   skill and follow the active skill instead.
3. Read the epic title and goal.
4. Do a shallow scan only when needed to make questions project-specific.
5. Replace the generic seed questions in `## Questions` with concrete questions
   for this project, grouped by scope, architecture, data, auth, deploy, tests,
   risks and product impact.
6. Mark critical questions that block planning.
7. If no open questions remain, state it explicitly in the section with the reason.
8. Leave every other section of `research.md` untouched for the researcher.
9. Before updating `state.json`, follow the "Plannotator (optional, per phase)"
   section of `core.md` against `research.md`.

## Output Format

The `## Questions` section of `research.md` contains:

1. Critical planning questions (blocking).
2. Non-blocking questions.
3. Assumptions that research can validate.

## Completion Criteria

- `## Questions` contains project-specific questions or an explicit no-open-questions note.
- Critical unknowns are visible before research starts.
- No other section of `research.md` was modified.
- No project code was edited.
- The Plannotator boundary check in `core.md` was followed (run or skipped per host capability).
- The questions task is marked done by editing `state.json` directly; no CLI is required (`atelier done` is only an optional helper).
