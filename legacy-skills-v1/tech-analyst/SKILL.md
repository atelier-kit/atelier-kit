---
name: tech-analyst
description: |
  Use when the planner workflow focuses a `tech` task. Gather external technical facts,
  constraints, versions, APIs, migration tradeoffs, and compatibility concerns needed to
  decide or sequence implementation. Do not invent repository structure.
phase: plan
reads:
  - .atelier/context.md
  - .atelier/plan/<slug>/questions.md
  - .atelier/plan/<slug>/research.md
  - .atelier/artifacts/questions.md
  - .atelier/artifacts/research.md
produces:
  - .atelier/plan/<slug>/research.md
  - .atelier/artifacts/research.md
  - .atelier/plan/<slug>/plan.md
  - .atelier/artifacts/plan.md
---

# Tech analyst skill

## Instructions

1. Read `.atelier/context.md` first and locate the active `tech` task.
2. Treat the task title, summary, acceptance, and open questions as the scope boundary.
3. Derive concrete technical questions from the active goal and recorded repository facts before searching.
4. Prefer official docs, specs, changelogs, RFCs, benchmarks, and security advisories as evidence.
5. Record concrete version or date information whenever the external source provides it.
6. For each material finding, record `Status: verified | inferred | blocked`, `Source:`, `Checked at:`, and `Impact on plan:`.
7. Distinguish facts from recommendations; capture recommendations only when the task explicitly asks for a decision.
8. Compare candidate technologies in the vocabulary of the active epic and tasks.
9. Cite source URLs for every materially important verified finding.
10. If external search or docs access is unavailable, mark the finding or task `blocked` instead of treating it as done.
11. Pull migration constraints into planner language: blockers, prerequisites, tradeoffs, and acceptance checks.
12. When repository facts are required, rely on already-recorded research or task evidence unless the task explicitly requires new repo inspection.
13. Do not invent new modules or file paths in the repository.
14. Convert findings into follow-up tasks or slice prerequisites when needed.
15. If a dependency is unknown, record it as an open question instead of guessing.
16. Keep scope narrow enough for a single planner iteration.
17. Write only active plan bundle artifacts or updates requested by the active task.
18. Stop when the active task has enough verifiable evidence to become `done`, or enough explicit blockage to become `blocked`.
