---
name: researcher
description: |
  Use when context phase is `research`, or the user says /research. Answer
  the active plan bundle's `questions.md` in three internal stages in a single artifact:
  repository mapping (`[repo]`), external technical research (`[tech]`), and
  market/UX benchmark (`[market]`). Never read the product goal capture document.
  No recommendations.
phase: research
reads:
  - .atelier/plan/<slug>/questions.md
  - .atelier/artifacts/questions.md
produces:
  - .atelier/plan/<slug>/research.md
  - .atelier/artifacts/research.md
---

# Researcher skill

## Instructions

1. Read the active plan's `questions.md` completely before opening code or external sources; prefer `.atelier/plan/<slug>/questions.md`, otherwise `.atelier/artifacts/questions.md`.
2. Do **not** read the goal capture document for this task (intentional isolation from product intent).
3. Work read-only on this repository: no writes to source or config except the research artifact.
4. Group questions by scope tag (`[repo]`, `[tech]`, `[market]`) and plan stages in that order.
5. Produce a single `research.md` with three stage sections: repo mapping, tech research, market/UX benchmark.
6. Under each stage section, create one `## Answer: n` block per question in the order they appear in `questions.md`.
7. Keep the global numbering of `## Answer: n` aligned with the question order in `questions.md`.
8. For `[repo]` answers, cite concrete code references: file paths, symbols, types.
9. For `[tech]` and `[market]` answers, cite at least one source URL per finding.
10. Prefer current sources (≤ 24 months old) for `[tech]` and `[market]`; mark older references explicitly.
11. Separate facts from interpretation; record facts only.
12. Avoid advice like "we should" or "the best approach".
13. Prefer quoting identifiers exactly as they appear in code or external specs.
14. Map import graph when `[repo]` questions ask about dependencies.
15. Trace data flow when `[repo]` questions ask where data is written or read.
16. Enumerate existing tests relevant to each `[repo]` answer when applicable.
17. Record explicit non-findings (dead ends) inside the answer block.
18. Keep each answer scoped; avoid sprawling narratives.
19. Never propose new files, public APIs, libraries, or vendors here.
20. For `[market]` findings, separate observation from interpretation and note regional considerations when implied.
21. For `[tech]` findings, capture version/date of the spec or docs cited.
22. Stop after filling all answers or marking unblockable gaps.
23. Use ripgrep-like systematic search patterns when navigating large trees.
24. Do not run destructive commands (rm, git reset, deploy scripts).
25. If tooling or network is unavailable, document the blockage factually per answer.
26. Do not mix stages: a `[repo]` answer must not contain external URLs as primary evidence.
27. Do not edit other phase artifacts; write only to the active plan's `research.md`.
28. Finish with a short "Open" list only for unanswered questions.
