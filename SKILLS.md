# Atelier-Kit v2 — Skills

Skills are loaded **on demand** by the agent based on `active_skill` in `state.json`.

Only one skill is loaded at a time. The agent must not load skills outside the current active_skill.

---

## Skill Inventory

| Skill | Phase | Writes |
|---|---|---|
| `repo-analyst` | discovery | `research/repo.md` |
| `tech-analyst` | discovery | `research/tech.md` |
| `business-analyst` | discovery | `research/business.md` |
| `planner` | synthesis, planning | `synthesis.md`, `plan.md` |
| `designer` | design | `decisions.md`, `design.md` |
| `implementer` | execution | `execution-log.md`, project files |
| `reviewer` | review | `review.md` |

---

## Skill Format

Each skill file has:

```text
Mission
Inputs
Allowed writes
Forbidden actions
Output format
Completion criteria
```

Skills are installed in `.atelier/skills/` by `atelier init`.

---

## repo-analyst

Maps repository facts for the active epic.

**Forbidden:** Do not edit project code. Do not create slices.

**Output:** Architecture patterns, relevant files, similar implementations, test locations, risks, unknowns.

---

## tech-analyst

Validates technical feasibility and dependency constraints.

**Forbidden:** Do not edit project code. Do not create slices.

**Output:** Libraries/APIs involved, version constraints, security concerns, integration risks, implementation notes.

---

## business-analyst

Maps user flow, edge cases and acceptance criteria.

**Forbidden:** Do not edit project code. Do not create final slices.

**Output:** User/business goal, happy path, error paths, edge cases, acceptance criteria candidates.

---

## planner

Transforms evidence into an executable plan.

**Forbidden:** Do not edit project code. Do not mark a plan as approved. Do not execute slices.

**Output:** Evidence summary, assumptions, risks, slices, acceptance criteria, validation steps.

---

## designer

Records architectural decisions and solution design.

**Forbidden:** Do not edit project code. Do not execute slices.

**Output:** Chosen design, alternatives considered, trade-offs, data contracts, API contracts, rollback considerations.

---

## implementer

Executes only the current approved slice.

**Forbidden:** Do not execute future slices. Do not alter the approved plan silently.

**Output:** Implementation + updated `execution-log.md` + slice marked done/blocked/needs-review.

---

## reviewer

Reviews completed execution against the approved plan.

**Forbidden:** Do not implement new scope. Do not approve your own unvalidated changes.

**Output:** What changed, validation performed, risks remaining, follow-up tasks, epic done/blocked.
