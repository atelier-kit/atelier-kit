---
name: tech-analyst
description: |
  Use when the planner workflow focuses a `tech` task. Gather external technical facts,
  constraints, versions, APIs, migration tradeoffs, and compatibility concerns needed to
  decide or sequence implementation. Do not invent repository structure.
phase: plan
reads:
  - .atelier/context.md
  - .atelier/artifacts/questions.md
  - .atelier/artifacts/research.md
produces:
  - .atelier/artifacts/research.md
  - .atelier/artifacts/plan.md
---

# Tech analyst skill

## Instructions

1. Read `.atelier/context.md` first and locate the active `tech` task.
2. Treat the task title, summary, acceptance, and open questions as the scope boundary.
3. Prefer public docs, specs, changelogs, RFCs, benchmarks, and security advisories as evidence.
4. Record concrete version or date information whenever the external source provides it.
5. Distinguish facts from recommendations; capture recommendations only when the task explicitly asks for a decision.
6. Compare candidate technologies in the vocabulary of the active epic and tasks.
7. Cite source URLs for every materially important finding.
8. Pull migration constraints into planner language: blockers, prerequisites, tradeoffs, and acceptance checks.
9. When repository facts are required, rely on already-recorded research or task evidence unless the task explicitly requires new repo inspection.
10. Do not invent new modules or file paths in the repository.
11. Convert findings into follow-up tasks or slice prerequisites when needed.
12. If a dependency is unknown, record it as an open question instead of guessing.
13. Keep scope narrow enough for a single planner iteration.
14. Write only planning artifacts or updates requested by the active task.
15. Stop when the active task has enough evidence to become `ready`, `blocked`, or `done`.
