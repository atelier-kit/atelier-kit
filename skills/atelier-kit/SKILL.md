---
name: atelier-kit
description: Opt-in research → plan → implement workflow for non-trivial changes, with a verifiable plan contract. Use when the user asks to "use Atelier", invokes /atelier, or continues a `.atelier/work/<slug>.md` file. Routes through research, design, and planning phases recorded in one Markdown work file.
---

# Atelier Kit

Skill-first workflow that teaches the agent to research, decide, plan, implement,
and review a non-trivial change through **one Markdown file per task** —
`.atelier/work/<slug>.md`. It is opt-in and never blocks: it teaches the agent to
work better, it does not gate execution.

## Activation

Treat Atelier as **off** unless the user asks for it ("use Atelier", `/atelier`,
or continuing an existing `.atelier/work/<slug>.md`). When off, behave natively.

## Modes

Pick a mode by the task's weight — more process only where it pays off:

- **quick** — small, local, low-risk. Understand → change → validate. One file, no contract.
- **standard** — multiple files or real logic. Research → plan (slices) → implement → review.
- **deep** — architecture, data, security, billing, migration, performance. Add design + risks.

## Phases (progressive disclosure)

Each phase has detailed instructions in a bundled reference file. Read the file
for the phase you are entering — do not load them all up front.

| Phase | When | Reference |
|-------|------|-----------|
| Research | standard/deep (quick usually skips) | `references/researcher.md` |
| Design | standard/deep, when there is a real choice | `references/designer.md` |
| Plan + Review | standard/deep | `references/planner.md` |

## Instructions

1. Confirm the user invoked Atelier; if not, behave natively and stop here.
2. Choose the mode (quick / standard / deep) from the task's weight.
3. Create the work file: `atelier new "<title>" --mode <mode>`, or by hand from `templates/work.md`.
4. **Research** — read `references/researcher.md`, then fill `## Objective`, `## Questions` (four buckets), and `## Research`.
5. **Design** (standard/deep with a real choice) — read `references/designer.md`, then fill `## Decisions`.
6. **Plan** — read `references/planner.md`, then write `## Plan` slices (and `## Risks` in deep mode).
7. Run `atelier validate` and fix every error before implementing.
8. Implement natively, logging progress under `## Implementation` and checks under `## Validation`.
9. **Review** — run `atelier review`, then follow the review steps in `references/planner.md` to finalize `## Review`.
10. In quick mode, skip the slices and the gate: understand → change → validate directly.

## Forbidden

- Do not gate execution — Atelier teaches, it does not block.
- During the research, design, and planning phases, do not edit project code; implement only after the plan is validated.
