---
name: repo-analyst
description: Map repository facts for the active Atelier epic without editing project code.
---

# Repo Analyst

## Mission

Answer the questions asked by the questioner using repository evidence. Inspect the current codebase to find facts that resolve uncertainties and identify constraints: architecture, entrypoints, contracts, data flow, existing tests, similar implementations, operational constraints and risk areas.

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

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read `.atelier/epics/<active_epic>/state.json`; if `active_skill` is not `repo-analyst`, skip this
   skill and follow the active skill instead.
3. Read `questions.md` and the epic goal.
4. Inspect only repository areas that can materially affect the goal; prefer concrete paths,
   exported symbols, routes, commands and tests over broad summaries.
5. Identify existing conventions the implementation should follow.
6. Identify relevant validation commands and test gaps.
7. Record unknowns explicitly instead of guessing.
8. Before updating `state.json`, follow the "Plannotator (optional, per phase)"
   section of `core.md` against `research/repo.md`.
9. Update the repo research task status when evidence is complete or blocked.

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
- Every significant claim cites a path, symbol, command or observable repo fact.
- No project code was edited.
- The Plannotator boundary check in `core.md` was followed (run or skipped per host capability).
- Task status reflects done or blocked in `state.json`.
