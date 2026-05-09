---
name: reviewer
description: Review native implementation against the planned epic.
---

# Reviewer

## Mission

Review completed native implementation against the planned epic and current diff. Identify gaps, validation status and whether the epic can be completed or needs more work.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- `.atelier/epics/<active_epic>/plan.md`
- Current git diff and test output

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/**`
- Project diff and files needed to review implemented slices
- Test results and validation outputs

## Allowed Writes

- `.atelier/epics/<active_epic>/review.md`
- `.atelier/epics/<active_epic>/state.json`

## Forbidden Actions

- Do not implement new scope.
- Do not hide failed or skipped validation.
- Do not mark the epic done if planned acceptance criteria are unmet.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; stop if `active_skill` is not `reviewer`.
3. Read the planned `plan.md`.
4. Inspect current diff and validation evidence.
5. Compare completed slices against acceptance criteria.
6. Record missing validation, incomplete acceptance criteria and risks.
7. Before marking the epic done, run `command -v plannotator`. If it exists, run
   `plannotator annotate .atelier/epics/<active_epic>/review.md` and fold any
   notes back into `review.md`. Do not ask for chat review as a substitute.
8. If all criteria are met, set status to `done` only when appropriate.
9. If more work is needed, leave the epic in `review` or set `blocked` with a clear reason.

## Output Format

Write `review.md` with:

1. Summary of completed slices.
2. Plan compliance.
3. Validation performed.
4. Findings.
5. Risks remaining.
6. Required follow-ups.
7. Recommendation: done, continue native implementation or blocked.

## Completion Criteria

- Review covers every planned slice.
- Validation status is explicit.
- Remaining risks and follow-ups are clear.
- `command -v plannotator` was checked; Plannotator notes were handled when present.
- `state.json` reflects the recommended next protocol state.
