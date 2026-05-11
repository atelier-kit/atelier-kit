---
name: host-plan-coach
description: Guide host-native plan mode through the Atelier V2 artifact flow without creating a second state model.
phase: planning
reads:
  - .atelier/active.json
  - .atelier/epics/<active_epic>/state.json
produces:
  - .atelier/epics/<active_epic>/questions.md
  - .atelier/epics/<active_epic>/research/repo.md
  - .atelier/epics/<active_epic>/research/tech.md
  - .atelier/epics/<active_epic>/research/business.md
  - .atelier/epics/<active_epic>/synthesis.md
  - .atelier/epics/<active_epic>/decisions.md
  - .atelier/epics/<active_epic>/design.md
  - .atelier/epics/<active_epic>/plan.md
  - .atelier/epics/<active_epic>/state.json
---

# Host Plan Coach

## Mission

Let the host agent do native planning while Atelier keeps only the durable V2
planning artifacts and final gate. The CLI is a bootstrap and validation helper;
the agent advances the flow by following the active skill and updating the active
epic ledger.

## Instructions

1. Read `.atelier/active.json`, then `.atelier/epics/<active_epic>/state.json`.
2. Treat `.atelier/epics/<active_epic>/state.json` as the only operational state.
3. Do not use `.atelier/context.md` or `.atelier/plan/<epic>`; those are not V2 sources of truth.
4. Follow the active task order recorded in `tasks`.
5. Load only the skill named by `active_skill` for the current task.
6. Keep all planning artifacts under `.atelier/epics/<active_epic>/`.
7. Work on one phase at a time. Do not draft `research/tech.md`, `design.md`,
   `decisions.md`, or `plan.md` until the matching task is active.
8. Do not edit application source files while the epic is before `planned`.
9. Replace generic `questions.md` seed questions before marking the questions task done.
10. Record repository evidence in `research/repo.md` with concrete files and symbols.
11. Record current external technical evidence in `research/tech.md` when the task exists.
12. Record product, rollout, and UX evidence in `research/business.md` when the task exists.
13. Use `synthesis.md`, `decisions.md`, and `design.md` to narrow tradeoffs before final planning.
14. Write `plan.md` as the final planning artifact.
15. `plan.md` must include `## Goal`, `## Risks`, and `## Slices`.
16. Each slice must have `### Slice N`, `**Goal:**`, `**Acceptance criteria:**`, and `**Validation:**`.
17. Mirror the same slices in `state.json.slices`.
18. Before marking a task done, check: `command -v plannotator`. If found,
    open the task's artifact with `plannotator annotate <artifact-path>` and fold
    notes back. Otherwise, continue without Plannotator.
19. When the plan is ready and Plannotator notes have been handled, set `status`
    to `planned` and `active_skill` to `null`.
20. Keep `.atelier/active.json.active_phase` and `.atelier/active.json.active_skill` synchronized with the epic state.
21. Export a native plan mirror with `atelier export-plan --adapter <adapter>` after the epic reaches `planned`.
22. After `planned`, implementation belongs to the host agent workflow.
23. After implementation, run or request `atelier review` to compare the diff against `plan.md`.

## Completion Criteria

- The active epic is `planned`.
- `plan.md` is not a stub.
- `state.json.slices` matches the planned slices.
- `atelier validate --gate plan-ready` passes.
