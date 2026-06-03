# Atelier Kit

Atelier Kit is a skill-first workflow for non-trivial changes —
**research → plan → implement** — with a verifiable plan contract. It is opt-in
and never blocks: it teaches the agent to work better, it does not gate execution.

## Activation

Treat Atelier as **off** unless the user asks for it ("use Atelier", `/atelier`,
or continuing an existing `.atelier/work/<slug>.md`). When off, behave natively.

When on, choose a mode by the task's weight:

- **quick** — small, local, low-risk. Understand → change → validate. One file, no contract.
- **standard** — multiple files or real logic. Research → plan (slices) → implement → review.
- **deep** — architecture, data, security, billing, migration, performance. Add design + risks.

## How it works

- One artifact per task: `.atelier/work/<slug>.md`. Create it with
  `atelier new "<title>" --mode <mode>`, or by hand from `templates/work.md`.
- One umbrella skill, **atelier-kit**, routes through phases — **research** →
  **design** (standard/deep) → **plan** (then review) — reading the matching
  `references/<phase>.md` on demand.
- In standard/deep, the `## Plan` slices are a contract: each declares
  `Allowed files`, observable `Acceptance criteria`, and a runnable `Validation`
  command.
- `atelier validate` checks the contract (mode-scaled). Implement natively. Then
  `atelier review` compares the diff against the plan and writes `## Review`.
- If `command -v plannotator` succeeds, each skill annotates the work file with
  `plannotator annotate .atelier/work/<slug>.md` before handing off. Optional —
  it only runs when Plannotator is installed.

## Skills

This repo ships a single Agent Skill, **atelier-kit**, with the research, design,
and planning phases bundled as `references/*.md` (progressive disclosure). Install
it across agents with `npx skills add atelier-kit/atelier-kit` — it lands as one
directory (`.claude/skills/atelier-kit/`), not three.
