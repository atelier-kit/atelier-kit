---
name: researcher
description: Single discovery skill for the active Atelier epic. Routes to questions, repo, tech, or business sub-mode based on the active task in state.json.
---

# Researcher

## Mission

Produce the discovery artifacts needed for planning: questions first, then the
research tracks that the active epic mode requires. One skill, four sub-modes;
`state.json` tells you which sub-mode is active.

## Routing

Read the in-progress (or first pending) task in `state.json` and switch on its
`type`:

| Task type    | Sub-mode  | Artifact                          |
|--------------|-----------|-----------------------------------|
| `questions`  | Questions | `questions.md`                    |
| `repo`       | Repo      | `research/repo.md`                |
| `tech`       | Tech      | `research/tech.md`                |
| `business`   | Business  | `research/business.md`            |

Only act on the active sub-mode. Do not fill artifacts for later sub-modes.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- Active epic title and goal
- Earlier discovery artifacts in `.atelier/epics/<active_epic>/`

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files relevant to the active epic (source, tests, dependency
  manifests, framework config, product docs)
- Current official documentation when dependency/API facts may have changed

## Allowed Writes

- `.atelier/epics/<active_epic>/questions.md` (questions sub-mode)
- `.atelier/epics/<active_epic>/research/repo.md` (repo sub-mode)
- `.atelier/epics/<active_epic>/research/tech.md` (tech sub-mode)
- `.atelier/epics/<active_epic>/research/business.md` (business sub-mode)
- `.atelier/epics/<active_epic>/state.json` only to advance the active task

## Forbidden Actions

- Do not edit project code.
- Do not create implementation slices.
- Do not finalize or implement a plan.
- Do not fill artifacts for sub-modes other than the active task.
- Do not load unrelated Atelier skills.

## Instructions (all sub-modes)

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; stop if `active_skill` is not `researcher`.
3. Identify the active task and pick the matching sub-mode (table above).
4. Read prior discovery artifacts for context (questions for repo/tech/business;
   repo evidence for tech/business when present).
5. Run the sub-mode procedure below.
6. Before marking the task done in `state.json`, run `command -v plannotator`.
   If it exists, run
   `plannotator annotate .atelier/epics/<active_epic>/<artifact>` and fold any
   notes back into that same artifact. Do not ask for chat review as a
   substitute.
7. Update the task status in `state.json` when the artifact is complete or
   blocked. The agent advances state directly — there is no CLI helper.

## Sub-mode: Questions

Turn the user's goal into concrete investigation questions before repository
or technical research begins.

1. Read the epic title and goal.
2. Do a shallow repo scan only when needed to keep questions project-specific.
3. Replace the generic seed placeholders in `questions.md` with concrete
   questions grouped by category (scope, architecture, data, auth, deploy,
   tests, risks, product impact).
4. Mark critical questions that block planning.
5. If no open questions remain, write an explicit `## No Open Questions`
   section with the reason.
6. Do not mark the task done while `questions.md` is still generic.

**Output `questions.md` with:** goal recap; critical planning questions;
non-blocking questions; assumptions to validate during research; questions
deferred to repo/tech/business/design.

## Sub-mode: Repo

Build repository evidence — facts from the current codebase.

1. Read `questions.md` and the epic goal.
2. Inspect only repo areas that can materially affect the goal.
3. Prefer concrete paths, exported symbols, routes, commands, and tests over
   broad summaries.
4. Identify existing conventions the implementation should follow.
5. Identify relevant validation commands and test gaps.
6. Update `questions.md` with project-specific open questions discovered during
   repository research.
7. Record unknowns explicitly instead of guessing.

**Output `research/repo.md` with:** scope/goal recap; relevant architecture
and entrypoints; existing patterns to follow; files and symbols likely
affected; data/API/persistence/operational constraints; existing tests and
validation commands; risks; unknowns and questions; evidence references using
concrete file paths.

## Sub-mode: Tech

Validate technical feasibility and dependency constraints.

1. Read repo research first when it exists.
2. Inspect dependency versions and relevant config.
3. Verify external API or library behavior from official docs when unstable or
   version-sensitive.
4. Identify security, compatibility, migration, and rollback concerns.
5. Record feasible implementation constraints — not a final plan.
6. Do not invent external API behavior from memory when current docs are
   needed. Do not introduce new dependencies as a decision; only document
   feasibility.

**Output `research/tech.md` with:** technical scope; dependencies/versions/
framework constraints; relevant external API or library facts with source
notes; security and privacy constraints; performance/concurrency/data integrity
risks; migration and rollback considerations; validation commands or test
strategy implications; open technical questions.

## Sub-mode: Business

Clarify user-facing behavior, product constraints, acceptance criteria, and
edge cases. Translate the goal into outcomes that can be validated.

1. Restate the goal in user/business terms.
2. Identify happy paths, error paths, and edge cases.
3. Look for existing product language, tests, or flows that constrain expected
   behavior.
4. Draft acceptance criteria candidates that the planner can turn into slice
   criteria.
5. Separate confirmed requirements from assumptions.
6. Do not invent product requirements that conflict with the user request or
   repo evidence.

**Output `research/business.md` with:** user/business goal; personas/actors
if visible from context; happy path; error paths; edge cases; acceptance
criteria candidates; non-goals and out-of-scope items; product risks and open
questions.

## Completion Criteria (any sub-mode)

- The artifact for the active sub-mode is project-specific (no boilerplate).
- Significant claims cite concrete paths, symbols, commands, or observable
  facts.
- No project code was edited.
- `command -v plannotator` was checked; Plannotator notes were handled when
  present.
- `state.json` reflects whether the active task is done or blocked.
