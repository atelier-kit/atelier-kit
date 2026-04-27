# Atelier-Kit v2 — Gates

Gates are enforcement rules that prevent the agent from proceeding unless preconditions are met.

---

## Gate: `before_code`

**Description:** Project code cannot be edited unless execution is approved.

**Requires:**
- `active.active=true`
- `state.status=execution`
- `state.approval.status=approved`
- `state.allowed_actions.write_project_code=true`
- `state.current_slice!=null`

---

## Gate: `before_approval`

**Description:** Plan must be reviewable by a human.

**Requires:**
- `plan.md` exists
- Plan has a goal
- Plan has at least one slice
- Each slice has acceptance criteria
- Risks are documented
- Validation steps are documented

---

## Gate: `before_execution`

**Description:** Execution can only start after human approval.

**Requires:**
- `approval.status=approved`
- `state.status=approved`
- At least one slice with `status=ready`

---

## Gate: `after_slice`

**Description:** Each slice must leave a trace.

**Requires:**
- `execution-log.md` updated
- Slice status in `[done, blocked, needs-review]`
- Validation result present

---

## Premature Code Change Guard

When `status != execution`, any git diff outside `.atelier/**` is a protocol violation.

```text
If status ∈ {discovery, synthesis, design, planning, awaiting_approval, approved}:
  → project code diffs fail validation

If status = execution AND approval.status = approved:
  → project code diffs are allowed
```

Run `atelier validate` to detect violations.
