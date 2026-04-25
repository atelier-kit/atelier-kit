---
name: questions
description: |
  Use when context phase is `questions`, or the user says /questions. Read `.atelier/brief.md`
  and emit technical mapping questions only in the active plan bundle's `questions.md`.
  Do not leak
  prescriptive solutions; ask neutral questions about structure, technical facts, or market
  facts. Classify every question by scope: `repo`, `tech`, or `market`.
phase: questions
reads:
  - .atelier/brief.md
produces:
  - .atelier/plan/<slug>/questions.md
  - .atelier/artifacts/questions.md
---

# Questions skill

## Instructions

1. Open `.atelier/brief.md` and extract constraints and acceptance criteria.
2. Produce questions that map existing facts, not that design the fix.
3. Prefix every bullet with a scope tag: `[repo]`, `[tech]`, or `[market]`.
4. Use `[repo]` for questions the researcher answers by reading this codebase.
5. Use `[tech]` for external technical questions answered from docs, RFCs, benchmarks, CVEs.
6. Use `[market]` for competitor, pricing, UX benchmark, and regional/regulatory questions.
7. Prefer "which / where / what contracts" phrasing over "how should we".
8. Each `[repo]` bullet must be answerable from repository facts alone.
9. Each `[tech]` or `[market]` bullet must be answerable from public external sources.
10. Do not name proposed modules, libraries, or feature flags unless already in the brief.
11. Aim for 5–15 questions unless the brief is tiny.
12. Cover all three scopes when the brief implies external context; skip a scope only when irrelevant.
13. Remove duplicate questions that collapse into one lookup.
14. Sort questions from broad dependency mapping to narrow endpoints, grouping by scope when useful.
15. Include `[repo]` questions about tests when behavior is safety-critical.
16. Include `[repo]` questions about persistence only if data migration is plausibly involved.
17. Include `[repo]` observability questions when cross-service behavior is in scope.
18. Include `[tech]` questions about external APIs, protocols, or library constraints when integration is in scope.
19. Include `[market]` questions about competitor UX or pricing only when the brief implies benchmarking.
20. Avoid hypotheticals ("if we add X"); ask what exists today.
21. Never restate the product objective verbatim as a question.
22. Flag unclear brief areas as explicit `[repo]` or `[tech]` questions to the human.
23. Write in the repository's documentation language.
24. Save output only to the active plan's `questions.md`: prefer `.atelier/plan/<slug>/questions.md`; otherwise `.atelier/artifacts/questions.md`.
25. Do not edit application source files in this phase.
26. Do not draft design or outline content yet.
27. Stop when every question is objectively verifiable and tagged with a scope.
28. If the brief is empty, ask the human to complete `.atelier/brief.md` first.
