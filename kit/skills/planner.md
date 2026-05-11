---
name: planner
description: Transform active epic evidence into a native-agent implementation plan.
---

# Planner

## Mission

**Turn design into a verifiable implementation contract.** Produce `plan.md` with clear slices that deliver end-to-end value, respect file boundaries, define acceptance criteria, and include validation steps. This plan becomes the contract against which implementation is reviewed.

A slice is not a task. It is a vertical cut through the system that produces something testable and reviewable.

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
3. Read artifacts required by mode:
   - **quick**: `questions.md` + `research/repo.md`
   - **standard**: `questions.md` + research + `synthesis.md` + `decisions.md` + `design.md`
   - **deep**: all of standard + `research/business.md` + risk analysis
4. If design is not complete (for standard/deep), stop and block with a clear reason.
5. Consolidate evidence in `synthesis.md` if needed (findings, conflicts, key insights).
6. Plan slices:
   - Each slice delivers **end-to-end value** (user-visible, testable outcome), not a technical task.
   - Each slice is small enough for one agent iteration (rough heuristic: 1-3 file changes per slice).
   - Slices have dependencies defined (`depends_on` field) and can be reviewed independently.
   - `allowed_files` lists **exactly** which files this slice may modify (read-only access to others is OK).
   - `allowed_files` is a contract, not a suggestion; violations fail the gate.
7. For each slice:
   - Write a concrete goal (e.g., "Add user preference table and UI to select theme").
   - Define acceptance criteria that are observable and testable (not vague).
   - Define validation steps (test commands, manual checks) that prove criteria met.
8. Ensure risks identified in research are either mitigated by slices or explicitly documented.
9. Before finalizing as `planned`, run `command -v plannotator`. If found, annotate `plan.md` and fold notes back.
10. Set `status` to `planned` and `active_skill` to `null` only when the plan passes `atelier validate --gate plan-ready`.
11. Do NOT export native mirror; that is done separately after gate passes.

## Output Format

Write `.atelier/epics/<active_epic>/plan.md`:

```markdown
# Plan: [Epic Title]

## Goal
[Restate the epic goal clearly.]

## Mode
quick / standard / deep

## Evidence Summary
[Key findings from research, synthesis, design. ~2-3 bullets.]

## Assumptions
[Explicit assumptions the plan rests on.]

## Risks
[Known risks and mitigation strategies, or acceptance of risk.]

## Slices

### Slice 1: [Name]

**Goal:** [End-to-end outcome. E.g., "Persist user theme choice and apply on load."]

**Allowed files:**
- path/file-1.ts
- path/file-2.ts
- path/test.spec.ts

**Acceptance criteria:**
- [Observable criterion 1]
- [Observable criterion 2]
- [Observable criterion 3]

**Validation:**
- [Test command or manual check]
- [Boundary check: confirm no files outside allowed_files changed]

### Slice 2: [Name]
[Continue...]

## Native Implementation
After `plan-ready` gate approval, the plan will be exported to the agent's native location.
```

## Completion Criteria

- `plan.md` passes `atelier validate --gate plan-ready` (goal, assumptions, risks, slices with all required fields).
- Every slice goal is end-to-end and testable, not a technical subtask.
- Every slice's `allowed_files` is explicit and respected by acceptance criteria.
- Acceptance criteria are observable and measurable (not vague).
- Validation includes test commands that are runnable.
- Risks from research are either addressed by slices or explicitly accepted.
- No project code was edited.
- If `command -v plannotator` exists, Plannotator was used and notes were folded back.
  Otherwise, skill proceeds without Plannotator.
- Task status is `planned` in `state.json`; `active_skill` is `null`.
