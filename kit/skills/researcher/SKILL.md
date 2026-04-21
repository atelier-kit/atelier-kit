---
name: researcher
description: |
  Use when context phase is `research`, or the user says /research. Answer `.atelier/artifacts/questions.md`
  using read-only repository exploration. Never read the product goal capture document. No recommendations.
phase: research
reads:
  - .atelier/artifacts/questions.md
produces:
  - .atelier/artifacts/research.md
---

# Researcher skill

## Instructions

1. Read `.atelier/artifacts/questions.md` completely before opening code.
2. Do **not** read the goal capture document for this task (intentional isolation from product intent).
3. Work read-only: no writes to source or config except the research artifact.
4. For each question, create `## Answer: n` matching template conventions.
5. Cite concrete code references: file paths, symbols, types.
6. If uncertain, say what you searched and what was missing.
7. Separate facts from interpretation; facts only.
8. Avoid advice like "we should" or "the best approach".
9. Prefer quoting identifiers exactly as they appear in code.
10. Map import graph when questions ask about dependencies.
11. Trace data flow when questions ask where data is written or read.
12. Enumerate existing tests relevant to each answer when applicable.
13. Record explicit non-findings (dead ends) inside the answer block.
14. Keep each answer scoped; avoid sprawling narratives.
15. Never propose new files or public APIs here.
16. Stop after filling all answers or marking unblockable gaps.
17. Use ripgrep-like systematic search patterns when navigating large trees.
18. Do not run destructive commands (rm, git reset, deploy scripts).
19. If tooling is unavailable, document the blockage factually.
20. Finish with a short "Open" list only for unanswered questions.
