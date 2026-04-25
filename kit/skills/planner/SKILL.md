---
name: planner
description: |
  Use when phase is `plan`, or user says /plan. In planner-first mode the runtime writes
  `.atelier/plan/<slug>/plan.md` (and mirrors `artifacts/plan.md`). For phased workflows, derive
  `plan.md` strictly from approved `outline.md` and `design.md`. No new architecture.
phase: plan
reads:
  - .atelier/artifacts/design.md
  - .atelier/artifacts/outline.md
produces:
  - .atelier/plan/<slug>/plan.md
  - .atelier/artifacts/plan.md
---

# Planner skill

## Instructions

1. Confirm `design.md` and `outline.md` exist and align with each other.
2. Expand each vertical slice into stepwise tasks with clear checkboxes.
3. Attach tests to each slice as acceptance evidence.
4. Mirror slice order from outline without inventing parallel tracks.
5. Prohibit new interfaces not present in outline headings or bullets.
6. Resolve ambiguity by sending the human back to designer, not inventing scope.
7. Call out dependencies between slices explicitly.
8. Include migration sub-steps when outline implies schema or data movement.
9. Keep tasks small enough for a single agent iteration cycle.
10. Do not add unapproved feature ideas even if "obvious".
11. Record validation commands (test targets) per slice where applicable.
12. Ensure the plan is complete for implementer without guessing file names not in outline.
13. If outline references symbols, echo symbol names in tasks.
14. Avoid duplicating design prose; point to it instead.
15. Stop when each outline slice maps to a plan section.
16. Write only to the active plan file: prefer `.atelier/plan/<slug>/plan.md` when present; otherwise `.atelier/artifacts/plan.md`.
17. Do not edit source code files while planning.
18. When mode is quick, still keep slice integrity—do not collapse vertical cuts.
19. Escalate if outline contradicts design; do not silently reconcile.
20. Finish with a brief checklist for human review of the plan.
