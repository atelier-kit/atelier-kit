---
name: designer
description: |
  Use when phase is `design` or `outline`, or user says /design, /outline, /approve-design.
  Read brief + repo research + market research. Produce design.md then outline.md; no production code.
phase: design
reads:
  - .atelier/brief.md
  - .atelier/artifacts/research.md
  - .atelier/artifacts/market-research.md
produces:
  - .atelier/artifacts/design.md
  - .atelier/artifacts/outline.md
---

# Designer skill

## Instructions

1. Read `.atelier/brief.md`, `.atelier/artifacts/research.md`, and `.atelier/artifacts/market-research.md` fully first.
2. Build `design.md` using the template sections; keep 150–300 lines.
3. Anchor "Current state" strictly in research facts.
4. Express "Desired state" as testable behavior changes.
5. List adoptable patterns discovered in research under "Patterns to follow".
6. List sharp edges under "Patterns to avoid" with examples from code.
7. Record unresolved decisions under "Open decisions" with options, not code.
8. Do not paste large code blocks; reference paths instead.
9. Split structural detail into `outline.md` instead of bloating design.
10. Define vertical slices with clear boundaries and ordering.
11. For each slice, specify interfaces and data contracts at a high level.
12. Ensure outline ordering supports incremental integration testing.
13. Avoid committing to files outside the stated brief scope.
14. Do not write executable implementation steps inside design prose.
15. Use stable naming matching repository conventions from research.
16. Mark migration or rollout risks explicitly when relevant.
17. If research is incomplete, request a research refresh with targeted gaps.
18. Save design before outline when both are pending and phase is `design`.
19. Update outline when phase is `outline` or after `/approve-design` is conceptually done.
20. Never modify application source in this skill unless asked to scaffold docs only.
