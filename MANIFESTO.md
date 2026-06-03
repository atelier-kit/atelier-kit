# Atelier Kit Manifesto

## The problem

Agent-assisted development is fast and getting faster. But speed without
structure creates its own debt: agents jump straight to code, ask either too many
questions or none, scatter decisions through chat, and ship work that is hard to
audit against any plan.

The fix is not a heavier process. It is teaching the agent to **research, plan,
and implement** with more context and fewer assumptions — and giving the plan
just enough structure to be verifiable.

## What Atelier Kit is

A **skill-first behavior kit** for coding agents. It installs a few skills the
agent loads on demand, plus one Markdown file per task and a tiny optional CLI
that checks the plan. It teaches the agent to work better from the inside; it does
not control the agent from the outside.

## Principles

### 1. Teach, don't block

Atelier guides behavior; it does not gate execution. There is no blocking CLI, no
approval state, no mandatory ceremony. The agent follows good practice because the
skills are well designed — "before implementing something non-trivial, research
and write a short plan" — not because a tool refused to let it continue.

### 2. Research before implementation; ask less, research more

The researcher splits questions into four buckets — blocking-user,
repo-research, external-research, safe-assumptions — and asks the user only what
genuinely blocks a decision. Everything else is investigated first.

### 3. The plan is a verifiable contract

In standard/deep mode, each slice of the plan declares the files it may modify,
observable acceptance criteria, and a validation command an outside tool can run.
That contract is the agent's own commitment. The CLI checks two things and only
two: that the contract is auditable (`validate` rejects catch-all `allowed_files`
or unobservable criteria), and that the diff matches what was promised
(`review`). It is a linter on the contract the agent signed, not a judge of the
work — a flagged deviation may be legitimate.

### 4. Light by default, deeper on demand

Modes calibrate depth, not direction. **quick** is one file, no contract — process
smaller than the task. **standard** adds research and a sliced plan. **deep** adds
design and required risks. Same loop, weighted to risk.

### 5. State lives in the repo, as Markdown

The only operational artifact is `.atelier/work/<slug>.md` — versioned Markdown
you can read top to bottom and delete with one command. No JSON state machine, no
status ledger.

## What Atelier Kit is not

- **Not a workflow engine.** It does not control the agent or run your stack.
- **Not a replacement** for Claude Code, Cursor, Codex, Kiro, Windsurf, or any IDE.
- **Not mandatory.** When native flow is enough, don't invoke it.

## Where to go next

- [README.md](./README.md) — install and the 5-minute loop
- [PROTOCOL.md](./PROTOCOL.md) — the work file, modes, and the contract
- [ARCHITECTURE.md](./ARCHITECTURE.md) — skills + CLI internals
- [CONTRIBUTING.md](./CONTRIBUTING.md) — clean-room rule, dev setup

Not affiliated with HumanLayer. See [CREDITS.md](./CREDITS.md).
