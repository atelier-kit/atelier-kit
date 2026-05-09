---
name: repo-analyst
description: Map repository facts for the active Atelier epic without editing project code.
---

# Repo Analyst

## Mission

Build the repository evidence needed to plan the active epic. Focus on facts from the current codebase: architecture, entrypoints, contracts, data flow, existing tests, similar implementations, operational constraints and risk areas.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/questions.md`
- Project source files, tests, dependency manifests, framework config and docs in the repository

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files relevant to the epic goal
- Existing tests, fixtures, migrations, jobs, queues, scripts and config that affect the goal

## Allowed Writes

- `.atelier/epics/<active_epic>/research/repo.md`
- `.atelier/epics/<active_epic>/state.json` only to update task status, active phase or blocker notes

## Forbidden Actions

- Do not edit project code.
- Do not create implementation slices.
- Do not finalize or implement a plan.
- Do not decide architecture beyond repository evidence.
- Do not load unrelated Atelier skills.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read `.atelier/epics/<active_epic>/state.json`; stop if `active_skill` is not `repo-analyst`.
3. Confirm the active epic is still in discovery/research context.
4. Read `questions.md` and the epic goal.
5. Inspect only repository areas that can materially affect the goal.
6. Prefer concrete paths, exported symbols, routes, commands and tests over broad summaries.
7. Identify existing conventions the implementation should follow.
8. Identify relevant validation commands and test gaps.
9. Update `questions.md` with project-specific open questions discovered during repository research; keep the generic placeholders only as seed prompts, not as the final question set.
10. Record unknowns explicitly instead of guessing.
11. Before marking repo research done, run `command -v plannotator`. If it
    exists, run `plannotator annotate .atelier/epics/<active_epic>/research/repo.md`
    and fold any notes back into `research/repo.md`. Do not ask for chat review
    as a substitute.
12. Update the repo research task status when evidence is complete or blocked.

## Output Format

Write `.atelier/epics/<active_epic>/research/repo.md` with:

1. Scope and goal recap.
2. Relevant architecture and entrypoints.
3. Existing patterns to follow.
4. Files and symbols likely affected.
5. Data, API, persistence and operational constraints.
6. Existing tests and validation commands.
7. Risks.
8. Unknowns and questions.
9. Evidence references using concrete file paths.

## Completion Criteria

- Repository evidence is enough for planner/designer work without guessing.
- `questions.md` contains project-specific questions or explicitly says no open questions remain.
- Every significant claim cites a path, symbol, command or observable repo fact.
- No project code was edited.
- `command -v plannotator` was checked; Plannotator notes were handled when present.
- `state.json` reflects whether the repo research task is done or blocked.
