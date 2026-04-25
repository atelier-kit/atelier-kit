---
name: implementer
description: |
  Use when phase is `implement`, or user says /implement. Follow `plan.md` vertical slices in order;
  tests for slice N pass before slice N+1. Record deviations in `impl-log.md`.
phase: implement
reads:
  - .atelier/plan/<slug>/outline.md
  - .atelier/artifacts/outline.md
  - .atelier/plan/<slug>/plan.md
  - .atelier/artifacts/plan.md
produces:
  - repository (source)
  - .atelier/plan/<slug>/impl-log.md
  - .atelier/artifacts/impl-log.md
---

# Implementer skill

## Instructions

1. Load outline and plan; pick the first incomplete slice.
2. Implement that slice across all layers needed for end-to-end behavior.
3. Run the slice's tests before moving on; fix failures in-place.
4. Record slice status and deviations inside the active plan's `impl-log.md`.
5. Do not start slice N+1 until slice N is green.
6. If outline is infeasible, stop and document the concrete blocker.
7. Do not expand public surface area beyond outline without human approval.
8. Prefer minimal diffs that satisfy the slice acceptance checks.
9. Keep compatibility with existing callers unless outline says otherwise.
10. Add tests where plan lists them; mirror project test style.
11. Avoid drive-by refactors unrelated to the slice.
12. Note environment assumptions (flags, env vars) in the log when relevant.
13. Never rewrite unrelated modules without explicit instruction.
14. If migrations are part of the slice, ship them with the calling code in same slice.
15. Commit or prepare patch-friendly units as your workflow permits.
16. After each slice, summarize residual risks briefly in the log.
17. Stop when plan has no remaining tasks or human halts progress.
18. Do not perform final human approval; that belongs to review phase.
19. Escalate spec gaps to reviewer notes rather than guessing silently.
