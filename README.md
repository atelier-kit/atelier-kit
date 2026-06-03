# Atelier Kit

Atelier Kit is a **skill-first** workflow for AI coding agents:
**research → plan → implement**, with a verifiable plan contract — and without a
rigid CLI controlling the flow.

It helps agents stop jumping straight to code: ask better questions, research the
codebase, write a plan in small slices, implement, and review the result. It is
opt-in and never blocks — the skills teach the agent to work better; they don't
gate execution.

## Atelier in 5 minutes

1. **Install the skills** (works across agents via the open Agent Skills standard):

   ```bash
   npx skills add atelier-kit/atelier-kit
   ```

   Or copy `skills/` into your agent (Claude Code: `.claude/skills/`).

2. **Ask your agent to use it:**

   > "Use Atelier to plan this feature before implementing."
   > "Use Atelier in deep mode for this migration."
   > "Use Atelier to research how feature flags work — no code yet."

3. **The agent works through one file per task** — `.atelier/work/<slug>.md` —
   running the skills (`researcher` → `designer` → `planner`) and writing each
   section as it goes.

That's the whole loop. The optional CLI below only adds a deterministic check on
the plan for those who want it (e.g. in CI).

## Modes

The agent picks a mode by the task's weight — more process only where it pays off:

| Mode | For | Flow | Artifact |
|------|-----|------|----------|
| **quick** | small, local, low-risk | understand → change → validate | one file, no contract |
| **standard** | multiple files / real logic | research → plan (slices) → implement → review | `## Plan` with slices |
| **deep** | architecture, data, security, migration | + design + risks | full contract + risks |

## Skills

- **researcher** — turn a goal into four buckets of questions (blocking-user ·
  repo-research · external-research · safe-assumptions) and gather evidence.
- **designer** — record design decisions and trade-offs (standard/deep).
- **planner** — write the sliced plan, then review the implementation against it.

Each is a standard `skills/<name>/SKILL.md` package, loaded lazily by description.

## The work file

One Markdown file per task, `.atelier/work/<slug>.md`, holds the whole story:
objective, questions, research, plan, implementation, validation, decisions, and
review. See [`templates/work.md`](./templates/work.md) and worked
[`examples/`](./examples).

In standard/deep mode the `## Plan` slices are a **verifiable contract** — each
slice declares the files it may touch, observable acceptance criteria, and a
runnable validation command:

```markdown
### Slice 1 — healthz route

**Goal:** Add a /healthz route that returns 200 when the DB ping resolves.

**Allowed files:** `src/server/healthz.ts`, `test/routes/healthz.test.ts`

**Acceptance criteria:**

- A request to /healthz returns 200 and a status body when the ping resolves.

**Validation:**

- `pnpm test test/routes/healthz.test.ts`
```

## Optional CLI — the contract

Installation is handled by `npx skills`. The only thing code does better than the
agent itself is check the contract deterministically, so the CLI is tiny and
optional:

```bash
npx atelier validate [file]   # mode-scaled plan-ready gate
npx atelier review  [file]    # diff vs. allowed_files + run validation; writes ## Review
npx atelier new "<title>" --mode standard   # scaffold a work file (convenience)
```

- **`validate`** rejects weak plans in standard/deep — catch-all `allowed_files`
  (`src/**`), vague acceptance criteria, validation with no runnable command, and
  (deep) a missing `## Risks` section. Quick mode is advisory.
- **`review`** diffs the working tree against each slice's `allowed_files`, runs
  the `Validation` commands, and writes the result into `## Review`. In
  standard/deep it exits non-zero on drift or a failed check (usable in CI); quick
  is advisory.

The agent — not the CLI — writes every section. The CLI only refuses to bless a
contract too vague to be audited, and reports drift from it.

## Docs

- [MANIFESTO.md](./MANIFESTO.md) — what Atelier is and the principles behind it
- [PROTOCOL.md](./PROTOCOL.md) — the work file, modes, and the contract
- [ARCHITECTURE.md](./ARCHITECTURE.md) — how the skills and CLI fit together
- [AGENTS.md](./AGENTS.md) — passive activation context for agents

## License

MIT — see [LICENSE](./LICENSE).

## Credits

See [CREDITS.md](./CREDITS.md).
