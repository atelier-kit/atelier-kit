---
name: reviewer
description: Review native implementation against the planned epic, including diff × allowed_files scope compliance.
---

# Reviewer

## Mission

Review completed native implementation against the planned epic and current diff — the promise versus the delivery. Identify gaps, out-of-scope changes, validation status and whether the epic can be completed or needs more work.

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
- Do not dismiss out-of-scope files without an explicit justification.
- Do not mark the epic done if planned acceptance criteria are unmet.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; if `active_skill` is not `reviewer`, skip this
   skill and follow the active skill instead.
3. Read the planned `plan.md`.
4. Collect the changed files yourself (no CLI): use the host's diff against
   `state.json.guards.baseline_ref` (e.g. `git diff --name-only <baseline>` plus
   untracked files). This is a host tool, not the Atelier CLI.
5. **Compute the Scope Check yourself**: build the union of every slice's
   `allowed_files` from `state.json`, then list each changed file that matches
   none of those patterns and is not covered by
   `state.json.guards.allowed_pre_planned_paths`. For each out-of-scope file,
   either justify the deviation explicitly or flag it as plan drift, and append
   `out-of-scope change: <file>` to `state.json.violations`.
   (`atelier review` produces the same Scope Check automatically if you prefer to
   run it, but it is not required.)
6. For each planned slice, compare against: file boundaries, acceptance criteria
   and validation results.
7. Record missing validation, incomplete acceptance criteria and risks.
8. Read `## Progress` in `plan.md` (progress is recorded during implementation,
   not by the reviewer) and flag mismatches between it and the diff.
9. Write `review.md` yourself (see Output Format).
10. Before updating `state.json` (to `done` or otherwise), follow the
    "Plannotator (optional, per phase)" section of `core.md` against `review.md`.
11. If all criteria are met, set status to `done` only when appropriate.
12. If more work is needed, leave the epic in `review` or set `blocked` with a clear reason.

## Output Format

Write `review.md` with:

1. `## Changed Files` — the files from the diff.
2. `## Scope Check (diff × allowed_files)` — the allowed patterns and any files
   changed outside them (or a note that all changes are in scope).
3. Summary of completed slices.
4. Plan compliance per slice (file boundaries, acceptance criteria, validation).
5. Findings and drift from plan.
6. Risks remaining.
7. Required follow-ups.
8. Recommendation: done, continue native implementation or blocked.

## Completion Criteria

- Review covers every planned slice.
- Every out-of-scope file from the Scope Check is justified or flagged.
- Validation status is explicit.
- Remaining risks and follow-ups are clear.
- The Plannotator boundary check in `core.md` was followed (run or skipped per host capability).
- `state.json` reflects the recommended next protocol state.
