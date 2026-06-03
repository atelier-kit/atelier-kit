---
name: designer
description: Turn research into explicit design decisions and trade-offs before planning. Use in standard/deep Atelier tasks that have a real architectural, data, or API choice to make.
---

# Designer

## Mission

Record the design decisions that planning depends on, in the active
`.atelier/work/<slug>.md`, without editing project code.

## When to use

- Standard/deep work where there is a real choice (architecture, data, API, trade-off).
- Skip when the approach is obvious directly from research.

## Inputs

- `.atelier/work/<slug>.md` — the `## Research` section
- Project architecture and API files cited by the research

## Instructions

1. Read the work file's `## Research`; confirm the evidence is enough to decide.
2. Under `## Decisions`, record each significant decision: context, the decision, the reason, and consequences.
3. List the main alternatives considered and why they were rejected.
4. Capture the data, API, and integration contracts the plan must honor.
5. Note rollback and migration concerns when the change touches data or production.
6. Keep every decision traceable to evidence; do not invent architecture the research did not support.
7. Stop before writing slices, and do not edit project code.

## Output

`## Decisions` holds concrete, evidence-backed choices the planner can turn into
slices without inventing architecture.

## Forbidden

- Do not edit project code.
- Do not write slices or finalize a plan.
