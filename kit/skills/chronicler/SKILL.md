---
name: chronicler
description: |
  Use when phase is `learn`, or user says /learn. Append durable decisions to decision-log.md based
  on session artifacts; do not mutate other phase artifacts.
phase: learn
reads:
  - .atelier/context.md
  - .atelier/plan/<slug>/
  - .atelier/artifacts/
produces:
  - .atelier/plan/<slug>/decision-log.md
  - .atelier/artifacts/decision-log.md
---

# Chronicler skill

## Instructions

1. Read `.atelier/context.md` for phase history and returns metadata.
2. Skim final `review.md` and `impl-log.md` for decisions worth keeping.
3. Append dated sections to the active plan's `decision-log.md` only.
4. Capture what changed, why, and pointers to code areas—not huge diffs.
5. Record adopted patterns and rejected alternatives briefly.
6. Note follow-up tasks discovered late in review.
7. Avoid duplicating full design document contents.
8. Keep each entry readable in under a few minutes.
9. Never delete older log entries; this file is append-only.
10. Do not alter `plan.md`, `outline.md`, or source code in this phase.
11. Summarize operational knobs (flags, config) when relevant for future readers.
12. Link issues or tickets when IDs exist in artifacts.
13. If session aborted early, log partial lessons under a clear banner.
14. Prefer stable terminology that matches the codebase names.
15. Include owners or contacts only if already present in artifacts.
16. Stop after a concise session summary is recorded.
17. Do not back-fill fictional decisions that did not occur.
18. If multiple sessions touch same topic, merge clarity without erasing history.
19. Keep sensitive data out of the log unless already reviewed for sharing.
20. Confirm append-only write succeeded before ending the skill.
