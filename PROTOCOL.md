# Atelier-Kit Protocol

Atelier-Kit is **planning only**, turned on when you say so. The agent keeps doing
the reasoning; what changes is where artifacts land and what gets validated
before you call a plan finished.

**The runtime is 100% file-based.** Activation, bootstrap, gates, review and
finalization are all done by reading and writing files under `.atelier/`. The
`atelier` CLI is an **optional** convenience — it installs the files and can
re-verify state deterministically — but no planning step requires it. Every CLI
command below has a file-based equivalent the agent performs directly.

## Activation

- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...` turn Atelier on.
- Saying "Use Atelier-Kit for this feature" counts too.
- `/plan ...` remains host-native by default. If native-plan hooks are installed,
  plan mode can bootstrap an Atelier V2 epic and nudge the host agent through the
  same artifact flow.

While inactive, leave Atelier alone—no epics, no skills, no gates.

## Source of truth

Global activation lives in:

```text
.atelier/active.json
```

The active epic state lives in:

```text
.atelier/epics/<epic-slug>/state.json
```

The protocol does not stash operational state in a separate chat/session dump file.

## Activation and the file-based loop

Activation (`/atelier quick|plan|deep <goal>` or "use Atelier-Kit") is handled by
following `.atelier/skills/bootstrap.md`: the agent creates
`.atelier/epics/<slug>/state.json` + stub artifacts and sets `.atelier/active.json`
— no CLI. From there the loop is: read `active.json` → read the epic `state.json`
→ load only `.atelier/skills/<active_skill>.md` → write the artifact → update
`state.json`. `/atelier off` sets `active.json` back to inactive.

## CLI (optional)

The `atelier` commands are a convenience layer, not part of the runtime. They
scaffold folders, install adapter rules, and can re-verify gates/mirrors/review
deterministically. Everything they do at runtime, the agent can do file-based.

```bash
# Installation (how the files get into a repo)
atelier init
atelier render-rules --adapter cursor
atelier install-adapter claude-code

# Optional runtime equivalents (agent does these file-based)
atelier new "Add payment endpoint" --mode quick   # ≙ follow bootstrap.md
atelier validate --gate research-ready            # ≙ researcher self-check
atelier validate --gate plan-ready                # ≙ planner self-check
atelier export-plan --adapter claude-code         # ≙ copy plan.md to the mirror
atelier review                                    # ≙ follow reviewer.md
atelier next | atelier done | atelier off         # ≙ edit state.json / active.json
atelier status | atelier doctor                   # ≙ read the ledger
```

## Native plan mirrors

Atelier may mirror `plan.md` into host-agent planning files so users can use
Claude Code, Cursor, Kiro, Antigravity or external review tools. Mirrors are
derived artifacts. Canonical plan:

```text
.atelier/epics/<epic-slug>/plan.md
```

The agent writes the mirror by copying `plan.md` to the host's plan location;
`atelier export-plan` does the same as an optional helper (and `--command` can
invoke tools such as Plannotator afterwards, with `ATELIER_PLAN_PATH` pointing at
the mirror). Mirrors are optional — the canonical `plan.md` is authoritative.

When a plan is finalized, the epic becomes `planned`. The user can then let the
host agent implement from the canonical plan or a mirror.

## Planning order

Every standard/deep Atelier epic starts with questions.

```text
questioner -> researcher -> [designer] -> planner
```

`questioner` writes the `## Questions` section of `research.md` before research
starts. The section may be refined later, but it cannot remain as the generic
seed questions once the questions task is marked done. `researcher` fills the
remaining sections of the same document. `designer` runs in deep mode (optional
in standard). `quick` mode skips straight to `planner`, with research recorded
inline under `## Research Notes` in `plan.md`.

Artifacts per mode:

| Mode | Artifacts |
|---|---|
| quick | `plan.md` (with `## Research Notes`), `review.md` |
| standard | `research.md`, `plan.md`, `review.md` (`design.md` optional) |
| deep | `research.md`, `design.md`, `plan.md`, `review.md` |

`research.md` is one consolidated document (`## Questions`, `## Codebase`,
`## Constraints`, `## Product behavior` in deep, `## What exists vs what will
be created`, `## Open unknowns`), with a compactness budget of ~300 lines.
`design.md` embeds decisions as an ADR-style `## Decisions` section and, in
deep mode, `## Risk register`, `## Rollback` and `## Test strategy` sections.

The active skill updates `state.json` directly after writing its artifact.
`atelier next` and `atelier done` are optional helpers, not the core engine.

## Gates are self-checks

Gates are checklists each skill verifies against its own artifact before advancing
`state.json`. They are mechanical enough for the agent to audit itself, so no CLI
is required. Running `atelier validate --gate <name>` re-checks the same rules
deterministically and is a fine optional double-check.

## Research gate

The **research-ready** self-check (standard/deep) requires:

1. `research.md` exists with the sections required by the mode.
2. No `_Pending._` sections remain.
3. The generic seed questions were replaced.
4. Warns when the document exceeds the ~300-line budget.

## Planning gate

The **plan-ready** self-check requires:

1. An active epic exists.
2. `plan.md` exists.
3. The plan has goal, assumptions, risks and slices.
4. Every slice has a goal, allowed files, acceptance criteria and validation
   (allowed files are enforced both in `plan.md` and in `state.json.slices`).
5. `state.json` reflects the same reviewable slice structure.

## Living plan

`plan.md` stays alive after `planned`: per-slice progress is recorded under
`## Progress` during native implementation and any mirror is rewritten from
`plan.md` when it changes. The Atelier `plan.md` remains canonical.

## Implementation and review

After `planned`, Atelier is no longer driving the show. Implement however you
already implement—Cursor, Claude Code, scripts, whatever fits your repo.

Once code exists, the reviewer skill (`.atelier/skills/reviewer.md`) compares the
current diff and validation evidence against the planned slices, including the
**Scope Check**: it builds the union of the slices' `allowed_files`, lists every
changed file that matches none of them, and records out-of-scope files in
`review.md` and `state.json.violations` — all computed by the agent, no CLI.
`atelier review` produces the identical artifact if you prefer to run it. When the
review is acceptable the epic is set to `done`; otherwise implement more and
review again.

## Compatibility with pre-consolidation epics

Ledgers created before research consolidation remain valid: the legacy task
types (`repo`, `tech`, `business`, `synthesis`) and skill names
(`repo-analyst`, `tech-analyst`, `business-analyst`) still parse, legacy
research tasks are routed to the `researcher` skill, and their artifacts
(`questions.md`, `research/*.md`, `synthesis.md`, `decisions.md`) are still
accepted by validation. New epics always use the consolidated layout.
