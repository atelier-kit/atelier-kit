# Protocol

Atelier Kit is opt-in. When off, the agent behaves natively. When on, it works
through **one Markdown file per task** and — in standard/deep mode — a verifiable
plan contract.

## The work file

```
.atelier/work/<slug>.md
```

This is the only operational artifact. It is plain Markdown the agent reads and
writes; there is no JSON state machine. Sections:

| Section | Written by | Notes |
|---------|-----------|-------|
| `## Mode` | new / agent | `quick` \| `standard` \| `deep` |
| `## Objective` | researcher | one or two sentences |
| `## Questions` | researcher | four buckets (see below) |
| `## Research` | researcher | repository + external findings, with paths |
| `## Decisions` | designer | standard/deep, when there's a real choice |
| `## Plan` | planner | `### Approach` + `### Slice N` blocks (the contract) |
| `## Risks` | planner | required in deep mode |
| `## Implementation` | agent (native) | log per slice |
| `## Validation` | agent | tests/manual checks |
| `## Review` | `atelier review` | generated; the one CLI-owned section |

### The four question buckets

The researcher splits questions to ask the user as little as possible:

1. **Blocking user questions** — only what blocks a decision.
2. **Repository research questions** — answer from the codebase.
3. **External research questions** — verify in docs/APIs.
4. **Safe assumptions** — proceed without asking.

## Modes

- **quick** — no plan, no contract, no gate. Understand → change → validate.
- **standard** — `## Plan` slices with `Allowed files` + observable
  `Acceptance criteria` + runnable `Validation`.
- **deep** — same, plus a populated `## Risks` section.

## The contract (standard/deep)

Each slice declares:

- **Allowed files** — specific paths/globs it may modify (never catch-all like `src/**`).
- **Acceptance criteria** — observable conditions (>=8 words; avoid "works"/"is correct").
- **Validation** — at least one shell-runnable command.

`atelier validate` rejects a contract too vague to audit. After native
implementation, `atelier review` diffs the working tree against each slice's
`Allowed files`, runs the `Validation` commands, and exits non-zero on drift or
failure (quick mode is advisory). Verification is not authority: a flagged
deviation may be legitimate — record it under `## Review`.

## Flow

```
ask Atelier → choose mode → researcher → designer (standard/deep) → planner
  → atelier validate → implement natively → atelier review
```
