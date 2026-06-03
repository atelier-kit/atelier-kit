---
name: researcher
description: Investigate before changing code — turn a goal into sharp questions and repository/external evidence, recorded in the Atelier work file. Use at the start of any non-trivial task before planning or implementing.
---

# Researcher

## Mission

Fill the `## Objective`, `## Questions`, and `## Research` sections of the active
`.atelier/work/<slug>.md` before any plan is written. Research first; ask the user
only what genuinely blocks progress.

## When to use

- The user invoked Atelier, or the task is non-trivial (standard/deep).
- Quick mode usually skips this — go straight to the change.

## Inputs

- `.atelier/work/<slug>.md` — the active work file
- The repository: source, tests, configs, product docs
- Current official documentation when a fact is version-sensitive

## Instructions

1. Read the work file; note the `## Mode` and restate the `## Objective` in one or two sentences.
2. Write `## Questions` in four buckets:
   - **Blocking user questions** — only what blocks a decision; if none, say so.
   - **Repository research questions** — answerable from the codebase.
   - **External research questions** — to verify in docs/APIs.
   - **Safe assumptions** — what you will proceed on without asking.
3. Answer the repository questions: inspect only areas that affect the goal; prefer concrete paths, symbols, routes, commands, and existing tests over summaries.
4. Answer the external questions from current official docs when behavior is version-sensitive; never invent API behavior from memory.
5. Record findings under `## Research` (Repository findings, External findings), citing concrete file paths and observable facts.
6. Note risks and unknowns explicitly instead of guessing.
7. If `command -v plannotator` succeeds, run `plannotator annotate .atelier/work/<slug>.md` and fold its notes back in. Do not use chat review as a substitute.
8. Stop before designing or planning, and do not edit project code.

## Output

The work file's `## Objective`, `## Questions` (four buckets), and `## Research`
sections are concrete and project-specific — no template boilerplate left.

## Forbidden

- Do not edit project code.
- Do not write slices or finalize a plan.
- Do not turn every task into an interview — research what you can answer yourself.
