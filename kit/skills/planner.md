---
name: planner
description: Transform active epic evidence into a native-agent implementation plan; also runs review mode after native implementation.
---

# Planner

## Mission

Two modes share this skill, both signaled by `state.json.status`:

- **Plan mode** (`status` in `synthesis` / `planning`): transform evidence into
  a reviewable plan with sliced scope, allowed files, acceptance criteria, and
  validation steps. The plan is the contract between intent and
  implementation.
- **Review mode** (`status` in `review`): after native implementation, compare
  the current diff and validation evidence against the planned slices and
  record findings in `review.md`.

The planner prepares and audits work for native implementation; it never
implements.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- Discovery artifacts: `questions.md`, `research/**/*.md`
- Design artifacts when present: `decisions.md`, `design.md`
- In review mode: current git diff and validation outputs

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project files cited by research/design evidence
- In review mode: project diff and files needed to review implemented slices

## Allowed Writes

- `.atelier/epics/<active_epic>/synthesis.md` (plan mode)
- `.atelier/epics/<active_epic>/plan.md` (plan mode)
- `.atelier/epics/<active_epic>/review.md` (review mode)
- `.atelier/epics/<active_epic>/state.json`

## Forbidden Actions

- Do not edit project code.
- Do not implement slices.
- Do not bypass missing evidence; mark assumptions and risks.
- Do not add unrelated feature ideas.
- In review mode: do not implement new scope or hide failed validation.
- Do not mark an epic done if planned acceptance criteria are unmet.

---

## Plan mode

### Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; stop if `active_skill` is not `planner` or
   `status` is `review`.
3. Confirm project code writes are disabled.
4. Read required artifacts for the current mode:
   - `quick`: repo research may be enough.
   - `standard`: check repo and tech research; use business research when
     present.
   - `deep`: check repo, tech, and business research.
5. In standard and deep modes, do not start final planning until `design.md`
   and `decisions.md` are complete.
6. Write or update `synthesis.md` when evidence needs consolidation.
7. Create vertical slices that produce end-to-end value.
8. Each slice must have `id`, `title`, `goal`, `depends_on`, `allowed_files`,
   `acceptance_criteria`, and `validation`.
9. Keep slices small enough for one agent iteration.
10. Reflect the same slices in `state.json` and `plan.md`.
11. Before finalizing the epic as `planned`, run `command -v plannotator`. If
    it exists, run `plannotator annotate .atelier/epics/<active_epic>/plan.md`
    and fold any notes back into `plan.md`.
12. Set `status` to `planned` and `active_skill` to `null` only when the plan
    is ready for native implementation.
13. Export the native plan mirror with
    `atelier export-plan --adapter <adapter>` after the epic reaches
    `planned`.

### Output format

Write `plan.md` with:

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

### Completion criteria

- `plan.md` passes `atelier validate --gate plan-ready`.
- `state.json` has at least one ready slice.
- Every slice has allowed files, acceptance criteria, and validation.
- `command -v plannotator` was checked; Plannotator notes were handled when
  present.
- No project code was edited.

---

## Review mode

### Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; stop if `active_skill` is not `planner` or
   `status` is not `review`.
3. Read the planned `plan.md`.
4. Inspect current diff and validation evidence (the runner under
   `atelier review` does most of the mechanical checks; consume its output).
5. Compare completed slices against acceptance criteria.
6. Record missing validation, incomplete acceptance criteria, and risks.
7. Before marking the epic done, run `command -v plannotator`. If it exists,
   run `plannotator annotate .atelier/epics/<active_epic>/review.md` and fold
   any notes back into `review.md`.
8. If all criteria are met, set `status` to `done` in `state.json`.
9. If more work is needed, leave the epic in `review`, or set `blocked` with a
   clear reason.

### Output format

Write `review.md` with:

1. Summary of completed slices.
2. Plan compliance.
3. Validation performed.
4. Findings.
5. Risks remaining.
6. Required follow-ups.
7. Recommendation: `done`, continue native implementation, or `blocked`.

### Completion criteria

- Review covers every planned slice.
- Validation status is explicit.
- Remaining risks and follow-ups are clear.
- `command -v plannotator` was checked; Plannotator notes were handled when
  present.
- `state.json` reflects the recommended next protocol state.
