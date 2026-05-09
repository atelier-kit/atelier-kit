---
name: planner
description: Transform active epic evidence into a native-agent implementation plan.
---

# Planner

## Mission

Transform available evidence into a native-agent implementation plan with reviewable slices, allowed file scope, acceptance criteria and validation steps. The planner prepares work for native implementation; it does not implement.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/questions.md`
- `.atelier/epics/<active_epic>/research/**/*.md`
- `.atelier/epics/<active_epic>/synthesis.md`
- `.atelier/epics/<active_epic>/decisions.md`
- `.atelier/epics/<active_epic>/design.md`

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files cited by research/design evidence

## Allowed Writes

- `.atelier/epics/<active_epic>/synthesis.md`
- `.atelier/epics/<active_epic>/plan.md`
- `.atelier/epics/<active_epic>/state.json`

## Forbidden Actions

- Do not edit project code.
- Do not implement slices.
- Do not bypass missing evidence; mark assumptions and risks.
- Do not add unrelated feature ideas.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; stop if `active_skill` is not `planner`.
3. Confirm project code writes are disabled.
4. Read required artifacts for the current mode.
5. For quick mode, repo research may be enough; for standard mode, check repo and tech research and use business research when present; for deep mode, check repo, tech and business research.
6. In standard and deep modes, do not start final planning until `design.md` and `decisions.md` are complete.
7. Write or update `synthesis.md` when evidence needs consolidation.
8. Create vertical slices that produce end-to-end value.
9. Each slice must have `id`, `title`, `goal`, `depends_on`, `allowed_files`, `acceptance_criteria` and `validation`.
10. Keep slices small enough for one agent iteration.
11. Reflect the same slices in `state.json` and `plan.md`.
12. Set `status` to `planned` and `active_skill` to `null` only when the plan is ready for native implementation.
13. Export the native plan mirror with `atelier export-plan --adapter <adapter>` after the epic reaches `planned`.

## Output Format

Write `.atelier/epics/<active_epic>/plan.md` with:

1. `# Plan: <Epic Title>`
2. `## Goal`
3. `## Mode`
4. `## Evidence Summary`
5. `## Assumptions`
6. `## Risks`
7. `## Slices`
8. `## Native Implementation`

Each slice section must include:

- `**Goal:**`
- `**Allowed files:**`
- `**Acceptance criteria:**`
- `**Validation:**`

## Completion Criteria

- `plan.md` passes `atelier validate --gate plan-ready`.
- `state.json` has at least one ready slice.
- Every slice has allowed files, acceptance criteria and validation.
- No project code was edited.
