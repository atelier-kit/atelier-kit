---
name: repo-analyst
description: Map repository facts for the active Atelier epic without editing project code.
---

# Repo Analyst

## Mission

**Answer the questions asked by the questioner using repository evidence.** Inspect the current codebase to find facts that resolve uncertainties and identify constraints: architecture, module boundaries, existing patterns, contracts, test coverage, operational concerns, and risk areas.

This is not exploration. This is targeted investigation guided by the questions in `questions.md`.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/questions.md` (the guide for what to investigate)
- Project source files, tests, config, migrations and scripts

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files relevant to answering the questions from `questions.md`

## Allowed Writes

- `.atelier/epics/<active_epic>/research/repo.md`
- `.atelier/epics/<active_epic>/state.json` (task status or blocker notes only)

## Forbidden Actions

- Do not edit project code.
- Do not propose implementation.
- Do not decide architecture (only document constraints).
- Do not explore beyond what answers the questions.
- Do not create slices.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read `.atelier/epics/<active_epic>/state.json`; stop if `active_skill` is not `repo-analyst`.
3. Read `questions.md` in full. These questions are your investigation guide.
4. Read the epic goal to understand context.
5. For each question in `questions.md`:
   - Is it answerable from the repository? If yes, find evidence. If no, mark it blocked.
   - Record findings with exact file paths, function signatures, command outputs.
   - Cite existing tests or patterns that will matter.
6. Identify conventions this implementation should follow (naming, structure, error handling).
7. Identify test command(s) that validate changes in this area.
8. Record unknowns explicitly. Do not guess at code behavior.
9. If blockers exist (e.g., "we cannot modify X because Y depends on it"), document them clearly.
10. Before marking done, run `command -v plannotator`. If found, run `plannotator annotate .atelier/epics/<active_epic>/research/repo.md` and fold notes back.
11. Update task status when evidence is complete or blocked.

## Output Format

Write `.atelier/epics/<active_epic>/research/repo.md` with:

1. **Goal and research questions** — what questions from `questions.md` does this answer?
2. **Architecture and entry points** — modules, files, initialization, public contracts.
3. **Existing patterns** — error handling, naming, testing structure, deployment practices to follow.
4. **Files that will be affected** — concrete paths and why (entry points, data models, configs).
5. **Constraints and risks** — backward compatibility, breaking changes, operational concerns, dependencies.
6. **Test commands and coverage** — how to validate changes, test gaps.
7. **Unknowns** — questions that could not be answered from the repository; deferred to tech research or design.
8. **Evidence references** — every claim cites a file path, function name, or test command.

## Completion Criteria

- Every question from `questions.md` has been investigated and answered or marked blocked.
- Claims are tied to file paths, symbols, or test outputs; no speculation.
- Constraints and risks are explicit.
- Test commands are validated (not assumed).
- No project code was edited.
- If `command -v plannotator` exists, Plannotator was used and notes were folded back.
  Otherwise, skill proceeds without Plannotator.
- Task status reflects done or blocked in `state.json`.
