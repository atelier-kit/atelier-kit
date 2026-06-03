# Architecture

Atelier Kit has two halves: **skills** (the product, Markdown) and a **tiny CLI**
(the optional contract checker, TypeScript).

## 1. Skills (the product)

```
skills/
  atelier-kit/
    SKILL.md                 # the router: activation, modes, phase flow
    references/
      researcher.md          # research-phase detail (loaded on demand)
      designer.md            # design-phase detail
      planner.md             # plan + review detail
```

One folder-based [Agent Skill](https://www.skills.sh/): `SKILL.md` carries the
`name`/`description` frontmatter and a lean `## Instructions` flow that routes to
the right `references/<phase>.md` as each phase begins (progressive disclosure).
The skill teaches the agent to research, decide, plan, and review, all by reading
and writing sections of `.atelier/work/<slug>.md`. It depends on no JSON state and
no CLI command to advance.

A single skill keeps the kit's identity intact on install: `npx skills add
atelier-kit/atelier-kit` walks `skills/<name>/SKILL.md` and installs each match as
its own directory — so the umbrella lands as one `.claude/skills/atelier-kit/`,
references included, instead of three loose sibling folders. Distribution is
delegated to `npx skills` (the open ecosystem): one canonical copy, symlinked or
copied into each agent's recognized skills location. Atelier ships no per-host
adapter layer of its own. `AGENTS.md` carries the passive activation context.

## 2. CLI (`src/`, the contract checker)

```
src/
  cli.ts                 # commander entry: new, validate, review
  commands/{new,validate,review}.ts
  work/                  # the work-file model
    types.ts             #   Mode, Slice, ParsedWork
    paths.ts             #   .atelier/work/<slug>.md, slugify
    template.ts          #   per-mode work.md skeleton
    parse.ts             #   markdown → { title, mode, slices }
    plan-ready.ts        #   mode-scaled contract gate
    discover.ts          #   resolve which work file to act on
    update.ts            #   rewrite the ## Review section
  review/                # reused diff/validation engine
    git-diff.ts · glob.ts · slice-check.ts · validation-runner.ts · report.ts
  skill-loader.ts        # parse SKILL.md frontmatter
  gates/instruction-budget.ts   # keep skills lean
```

The CLI parses the slice contract out of the work file's `## Plan` section and
does the two deterministic things an agent can't fake:

- **`validate`** (`work/plan-ready.ts`) — mode-scaled gate. Quick is skipped;
  standard/deep require well-formed slices; deep also requires real risks.
- **`review`** (`commands/review.ts` + `src/review/*`) — diff the working tree
  against each slice's `allowed_files`, run the `Validation` commands, write the
  `## Review` section, and exit non-zero on drift/failure (quick is advisory).

## State

The only repo-side state is `.atelier/work/<slug>.md` files — versioned Markdown.
No `atelier.json`, `active.json`, epics, or status machine. Activation is by
prompt; the CLI is stateless and reads whatever work file you point it at (or the
most recently modified one).

## Tests

`test/` (vitest, `process.env.ATELIER_KIT_ROOT` no longer needed):

- `work-md.test.ts` — parser + slugify + review-section rewrite
- `plan-ready.test.ts` — the mode-scaled gate
- `review.test.ts` — end-to-end diff/validation with a temp git repo
- `skill-loader.test.ts` / `instruction-budget.test.ts` — skill packaging
