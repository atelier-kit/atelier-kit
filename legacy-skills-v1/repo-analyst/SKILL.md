---
name: repo-analyst
description: |
  Use when the planner focuses a task of type `repo`. Map the current repository state needed
  for planning: entrypoints, contracts, dependencies, tests, persistence, and operational seams.
  Report evidence and open questions without proposing architecture beyond the current scope.
phase: plan
reads:
  - .atelier/context.md
  - .atelier/brief.md
  - .atelier/plan/<slug>/
  - .atelier/artifacts/
produces:
  - .atelier/plan/<slug>/research.md
  - .atelier/artifacts/research.md
---

# Repo analyst skill

## Instructions

1. Read `.atelier/context.md` first and locate the active epic and current task.
2. Restrict work to the active task scope; do not answer unrelated questions.
3. Inspect repository code, config, docs, and tests to answer only repository-backed questions.
4. Cite concrete file paths, symbols, commands, and test targets for every finding.
5. Trace imports, call sites, persistence edges, and external interfaces when they affect the task.
6. Note missing evidence explicitly instead of guessing how the code works.
7. Record relevant test coverage and obvious gaps tied to the task.
8. Surface operational constraints such as env vars, jobs, queues, migrations, or deploy steps when visible in repo facts.
9. Keep outputs factual; do not recommend a final implementation path unless the task explicitly asks for decision support.
10. Prefer concise bullet findings over long prose.
11. If the repo state conflicts with prior planning artifacts, flag the contradiction explicitly.
12. Write findings into the active plan bundle when present, not into source code.
13. Do not edit application code in this skill.
14. Stop once the active repo task has enough evidence for synthesis or is clearly blocked.
