# atelier-kit architecture

Atelier-Kit is a filesystem-native Planning Protocol, not a planner-first
runtime. The host coding agent keeps its native behavior until Atelier is
explicitly activated, and the agent remains responsible for analysis and plan
authoring and implementation.

![Atelier mental execution flow](./assets/atelier-mental-execution-flow.png)

## Layers

1. **Protocol files** in `.atelier/protocol/`
2. **Rules and adapters** in `.atelier/rules/`
3. **On-demand skills** in `.atelier/skills/`
4. **Schemas** in `.atelier/schemas/`
5. **Per-epic ledgers** in `.atelier/epics/<epic>/`
6. **CLI helpers** that initialize, validate, render rules, export native plans
   and move protocol state

The methodology lives in the protocol files, schemas, rules, skills and epic
ledger. The CLI is intentionally thin: it performs deterministic state
transitions and validation, but it does not maintain a separate planner,
workflow runtime, session context or implementation engine.

## Source of truth

Global activation:

```text
.atelier/active.json
```

Active epic state:

```text
.atelier/epics/<epic-slug>/state.json
```

The active epic `state.json` stores:

- mode: `quick`, `standard` or `deep`
- status: `discovery`, `synthesis`, `design`, `planning`, `planned`, `review`,
  `done` or `blocked`
- active skill
- required artifacts
- slices
- guard metadata
- violations

No other file is operational state. Atelier does not use `.atelier/context.md`
or `.atelier/plan/` as a second source of truth.

## Activation model

Atelier is inactive by default.

```text
/plan add this endpoint
```

This remains native host-agent planning. The protocol does not create epics,
load skills, enforce gates or block code edits.

Atelier activates only through explicit requests:

```text
/atelier quick add this endpoint
/atelier plan add payments
/atelier deep migrate authentication to SSO
Use Atelier-Kit for this feature
```

## CLI surface

The primary commands are:

```bash
atelier init
atelier new "Add payment endpoint" --mode quick
atelier status
atelier validate
atelier doctor
atelier render-rules --adapter cursor
atelier export-plan --adapter claude-code
atelier review
atelier next
atelier done
atelier off
```

## State transitions

Typical flow:

```text
native
  -> discovery/questioner
  -> discovery/research
  -> synthesis
  -> design
  -> planning
  -> planned
  -> native agent implementation
  -> review
  -> done
```

`planned` is the handoff boundary. Atelier has produced a validated plan and a
native mirror. The host agent can then implement with its own plan UI, tools and
execution model.

## Validation

`atelier validate` checks:

- installation files
- `atelier.json`
- `active.json`
- active epic state
- state/action coherence
- required artifacts
- reviewable plan shape for `planned`, `review` and `done`
- slice goal, acceptance criteria and validation
- native plan mirror configuration

`atelier validate --gate plan-ready` is enforced before `atelier done` can
finalize planning. It requires:

- active epic exists
- `plan.md` exists
- plan has slices
- slices have goals, acceptance criteria and validation
- risks are documented

## Skills

Skills are phase lenses loaded on demand. The adapter should load only the file
named by `active_skill`.

Examples:

- `questioner` writes `questions.md`
- `repo-analyst` writes `research/repo.md`
- `planner` writes `synthesis.md`, `plan.md` and state updates
- `reviewer` writes `review.md` after native implementation

## Adapter rendering

`atelier render-rules --adapter <name>` writes concrete rule files for the
selected host:

| Adapter | Output |
|---|---|
| Cursor | `.cursor/rules/atelier-core.mdc` |
| Claude Code | `CLAUDE.md` |
| Codex | `AGENTS.md` |
| Cline | `.clinerules/atelier-core.md` |
| Windsurf | `.windsurfrules` |
| Generic | `AGENTS.md` |

Use `--stdout` to print instead of writing files.
