# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@atelier-kit/atelier-kit` — a **skill-first behavior kit** for coding agents. The product is a set of Markdown skills (`skills/<name>/SKILL.md`) distributed via the open Agent Skills standard (`npx skills`). A tiny Node 20+ CLI (`atelier` / `atelier-kit`) adds the one thing code does better than prose: checking and reviewing the **plan contract**. The agent does the thinking; the CLI only validates and reviews what it produces.

## Commands

Package manager: **pnpm 9** (declared in `package.json`). Use `pnpm` rather than `npm` to honor the lockfile.

```bash
pnpm install                # install deps
pnpm run build              # tsup → dist/cli.js (ESM, node20 target)
pnpm run dev                # tsup --watch
pnpm test                   # vitest run (single shot, used by CI)
pnpm run test:watch         # vitest watch mode
pnpm run lint               # tsc --noEmit  (this repo's "lint" is type-check)
```

Run a single test file or pattern:

```bash
pnpm exec vitest run test/work-md.test.ts
pnpm exec vitest run -t "quick mode is skipped"
```

Run the built CLI locally (after `pnpm run build`):

```bash
node dist/cli.js <command>             # e.g. node dist/cli.js validate
```

CI (`.github/workflows/ci.yml`) runs `lint`, `build`, `test`, and `npm pack --dry-run` on Node 20 and 22 — keep all four green.

## Architecture

Two halves: **skills** (the product, Markdown) and a **tiny CLI** (the contract checker, TypeScript). See `ARCHITECTURE.md` for the full map.

### 1. Skills (`skills/`)

`skills/{researcher,designer,planner}/SKILL.md` — folder-based Agent Skills with `name`/`description` frontmatter and an `## Instructions` section. They teach the agent to research (with the four question buckets), decide, plan, and review — all by writing sections of `.atelier/work/<slug>.md`. They depend on no JSON state and no CLI command to advance. `AGENTS.md` holds the passive activation context. `templates/` and `examples/` are shipped docs.

### 2. CLI (`src/`)

- `src/cli.ts` — commander entry. Three commands: `new`, `validate`, `review`.
- `src/work/` — the work-file model: `types.ts` (`Mode`, `Slice`, `ParsedWork`), `paths.ts` (`.atelier/work/<slug>.md`, `slugify`), `template.ts` (per-mode skeleton), `parse.ts` (Markdown → slices), `plan-ready.ts` (the mode-scaled gate), `discover.ts` (resolve which work file to act on), `update.ts` (rewrite the `## Review` section).
- `src/review/` — the diff/validation engine, reused from the old design: `git-diff.ts`, `glob.ts`, `slice-check.ts`, `validation-runner.ts`, `report.ts`. These now take the `Slice` type from `src/work/types.ts`.
- `src/commands/{new,validate,review}.ts` — thin command wrappers.
- `src/skill-loader.ts` + `src/gates/instruction-budget.ts` — parse and lint the shipped `SKILL.md` files.

### The work file (the only runtime state)

Inside a consumer repo, the only operational artifact is `.atelier/work/<slug>.md` — plain versioned Markdown. There is **no** `atelier.json`, `active.json`, epics, status machine, or JSON schema anymore. Sections: `## Mode`, `## Objective`, `## Questions` (four buckets), `## Research`, `## Decisions`, `## Plan` (the slice contract), `## Risks`, `## Implementation`, `## Validation`, `## Review`.

### The contract

In standard/deep mode, `## Plan` holds `### Slice N` blocks, each with `**Goal:**`, `**Allowed files:**`, `**Acceptance criteria:**`, `**Validation:**`. `parse.ts` extracts these; `plan-ready.ts` gates them (mode-scaled: quick skipped, deep also needs real `## Risks`); `review` diffs the working tree against `allowed_files`, runs the validation commands, and writes `## Review` (mode-scaled exit code). **If you change the work-file section names or slice field labels, update `src/work/{template,parse}.ts` and the docs together** — the Markdown shape is the public contract now.

### Activation model

Atelier is opt-in by prompt; the CLI is stateless. There is no inactive flag to short-circuit — if there's no work file, commands say so and exit non-zero. Outside an explicit "use Atelier", the agent behaves natively.

## Tests

- Vitest, Node env, ESM, files in `test/**/*.test.ts` (see `vitest.config.ts`).
- No `ATELIER_KIT_ROOT` needed anymore. `test/helpers.ts` exposes `tempDir()` and `skillsPath()` (the repo `skills/` dir).
- `test/review.test.ts` builds a temp git repo; follow that pattern. Most tests parse work Markdown directly via `src/work/parse.ts` — prefer that over scaffolding files.

## Conventions

- TypeScript, ESM, strict mode, NodeNext resolution. Imports use the `.js` extension even from `.ts` files (NodeNext requirement) — see `src/cli.ts`.
- Runtime dependencies: `commander`, `gray-matter`, `picocolors`, `zod`. Keep the install small; prefer logic over dependencies.
- Small modules with explicit file I/O boundaries (per `CONTRIBUTING.md`).
- Contributions must be clean-room original work (see `CONTRIBUTING.md`); do not paste prompts or large passages from other agent-tooling projects.

## Reference docs

- `MANIFESTO.md` — the principles (teach don't block, research first, verifiable contract, light-by-default, repo state)
- `PROTOCOL.md` — the work file, modes, and the contract
- `ARCHITECTURE.md` — skills + CLI internals
- `dev/refactor-plan.md` — record of the earlier 7-phase refactor (now superseded by the skill-first reposition in 0.4.0)
