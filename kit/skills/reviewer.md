---
name: reviewer
description: Review native implementation against the planned epic.
---

# Reviewer

## Mission

**Compare what was delivered against what was promised.** Review the implementation diff against each planned slice: check file boundaries, verify acceptance criteria, run validation, and identify drift. This is where the plan becomes enforceable.

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
3. Read `plan.md` in full. This is the contract you will evaluate against.
4. For each planned slice:
   - **Check file boundary**: Did the implementation respect `allowed_files`? Any violations?
   - **Check acceptance criteria**: Run or evaluate each criterion. Pass? Fail? Partial?
   - **Check validation**: Did the agent run the validation commands? What is the result?
   - **Check completeness**: Is the work done or is it unfinished?
5. Record results in `review.md`:
   - Slice by slice: what was delivered, what was skipped, what failed validation.
   - Drift from plan: if the implementation changed scope or files, explain why and whether it is justified.
   - Risks: any new risks introduced by implementation choices?
6. Produce a recommendation: mark epic `done`, continue implementation, or stay in `review` pending fixes.
7. Before marking done, run `command -v plannotator`. If found, annotate `review.md` and fold notes back.
8. Update `state.json` with final status: `done` only if all slices pass all criteria, otherwise `review` or `blocked`.

## Output Format

Write `.atelier/epics/<active_epic>/review.md`:

```markdown
# Review: [Epic Title]

## Summary
[Overview of what was implemented, what remains, overall status.]

## Slice Compliance

### Slice 1: [Name]
- **Files modified**: [List of actual changes]
- **Allowed files constraint**: ✓ Pass / ✗ Fail / ⚠ Violation: [Details]
- **Acceptance criteria**:
  - Criterion 1: ✓ Pass / ✗ Fail
  - Criterion 2: ✓ Pass / ✗ Fail
  - Criterion 3: ✓ Pass / ✗ Fail
- **Validation result**: [Test output or manual check result]
- **Status**: Complete / Incomplete / Unstarted

### Slice 2: [Name]
[Continue...]

## Drift from Plan
[Did the implementation deviate from `allowed_files`, acceptance criteria, or scope? Was the deviation justified?]

## Validation Evidence
[Test results, logs, screenshots, or manual verification.]

## Risks Remaining
[New risks introduced, unfinished work, corner cases not covered.]

## Recommendation
- **Epic status**: done / continue implementation / review / blocked
- **Next steps**: [Clear action if not done]
```

## Completion Criteria

- Every planned slice is reviewed (pass/fail on each criterion).
- File boundary violations (if any) are flagged.
- Validation was actually run (not assumed).
- Drift from plan is explicit and justified or flagged as a problem.
- Recommendation is clear: mark `done` only if all criteria pass.
- No guessing; only observable facts.
- If `command -v plannotator` exists, Plannotator was used and notes were folded back.
  Otherwise, skill proceeds without Plannotator.
- State is updated to the recommended next status.
