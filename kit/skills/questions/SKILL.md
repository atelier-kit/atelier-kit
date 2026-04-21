---
name: questions
description: |
  Use when context phase is `questions`, or the user says /questions. Read `.atelier/brief.md`
  and emit technical mapping questions only in `.atelier/artifacts/questions.md`. Do not leak
  prescriptive solutions; ask neutral questions about structure and facts.
phase: questions
reads:
  - .atelier/brief.md
produces:
  - .atelier/artifacts/questions.md
---

# Questions skill

## Instructions

1. Open `.atelier/brief.md` and extract constraints and acceptance criteria.
2. Produce questions that map the existing system, not that design the fix.
3. Prefer "which / where / what contracts" phrasing over "how should we".
4. Each bullet must be answerable from repository facts alone.
5. Do not name proposed modules, libraries, or feature flags unless already in the brief.
6. Aim for 5–15 questions unless the brief is tiny.
7. Remove duplicate questions that collapse into one codebase lookup.
8. Sort questions from broad dependency mapping to narrow endpoints.
9. Include questions about tests when behavior is safety-critical.
10. Include questions about persistence only if data migration is plausibly involved.
11. Include observability questions when cross-service behavior is in scope.
12. Avoid hypotheticals ("if we add X"); ask what exists today.
13. Never restate the product objective verbatim as a question.
14. Flag unclear brief areas as explicit questions to the human.
15. Write in the repository's documentation language.
16. Save output only to `.atelier/artifacts/questions.md`.
17. Do not edit application source files in this phase.
18. Do not draft design or outline content yet.
19. Stop when every question is objectively verifiable by reading code.
20. If the brief is empty, ask the human to complete `.atelier/brief.md` first.
