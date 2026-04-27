# Atelier-Kit v2 — Examples

---

## Example 1: Native plan mode (no Atelier)

```text
User: /plan add this endpoint
```

**Expected behavior:**
- Native agent plan mode.
- No Atelier artifacts created.
- No `.atelier/epics/` created.
- No approval gate.

---

## Example 2: Atelier quick mode

```text
User: /atelier quick add this endpoint
```

**CLI equivalent:**
```bash
atelier new "add this endpoint" --mode quick
```

**Expected behavior:**
1. Creates `.atelier/epics/add-this-endpoint/` with `state.json`.
2. `active.json` becomes `active=true`.
3. Agent loads `repo-analyst` skill.
4. Agent produces `research/repo.md`.
5. Agent loads `planner` skill and writes `plan.md` with ≤3 slices.
6. Status moves to `awaiting_approval`.
7. Agent presents plan and stops.

**Artifacts produced:**
- `questions.md`
- `research/repo.md`
- `plan.md`
- `execution-log.md` (after execution)
- `review.md` (after review)

---

## Example 3: Atelier standard mode

```text
User: /atelier plan add payment system
```

**CLI equivalent:**
```bash
atelier new "add payment system" --mode standard
```

**Expected behavior:**
1. Creates epic ledger.
2. Agent runs `repo-analyst` → `research/repo.md`.
3. Agent runs `tech-analyst` → `research/tech.md`.
4. Agent runs `business-analyst` → `research/business.md`.
5. Agent runs `planner` → `synthesis.md`.
6. Agent runs `designer` → `decisions.md` + `design.md`.
7. Agent runs `planner` → `plan.md`.
8. Status → `awaiting_approval`. Agent presents plan and stops.

**Human approval:**
```bash
atelier approve
atelier execute
# agent implements slice-001
atelier done
atelier next
# agent implements slice-002 ...
```

---

## Example 4: Atelier deep mode

```text
User: /atelier deep migrate authentication to SSO
```

**CLI equivalent:**
```bash
atelier new "migrate authentication to SSO" --mode deep
```

**Expected behavior:**
- Same as standard, plus:
  - `risk-register.md`
  - `rollback.md`
  - `test-strategy.md`
  - `critique.md`

---

## Example 5: Approval and execution flow

```bash
# After research and planning
atelier status
# → status: awaiting_approval

atelier validate
# → checks plan.md has slices, criteria, validation steps

atelier approve
# → approval.status: approved, status: approved

atelier execute
# → status: execution, current_slice: slice-001
# → write_project_code: true

# agent implements slice-001 ...
atelier done
# → slice-001 status: done

atelier next
# → current_slice: slice-002

# agent implements slice-002 ...
atelier done
atelier next
# → no more slices → status: review

# agent reviews and writes review.md
```

---

## Example 6: Rejection and replanning

```bash
atelier reject --reason "Need smaller slices, each slice is too large"
# → status: planning, approval.status: rejected
# agent revises plan.md and state.json slices array
```

---

## Understanding the Difference Between Modes

| Feature | `native` | `quick` | `standard` | `deep` |
|---|---|---|---|---|
| Atelier active | No | Yes | Yes | Yes |
| Approval gate | No | Yes | Yes | Yes |
| Research tracks | — | repo only | repo+tech+business | all |
| Risk register | No | No | No | Yes |
| Rollback plan | No | No | No | Yes |
| Max slices | — | 3 | — | — |
