# atelier-kit architecture

Atelier-Kit is a filesystem-native Planning Protocol, not a planner-first
runtime. The host coding agent keeps its native behavior until Atelier is
explicitly activated.

![Atelier mental execution flow](./assets/atelier-mental-execution-flow.png)

## Layers

1. **Protocol files** in `.atelier/protocol/`
2. **Rules and adapters** in `.atelier/rules/`
3. **On-demand skills** in `.atelier/skills/`
4. **Schemas** in `.atelier/schemas/`
5. **Per-epic ledgers** in `.atelier/epics/<epic>/`
6. **CLI helpers** that initialize, validate, render rules and move protocol
   state

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
- status: `discovery`, `planning`, `awaiting_approval`, `approved`,
  `execution`, `review`, `done`, `blocked` or `paused`
- active skill
- approval status
- allowed actions
- required artifacts
- slices
- pre-execution diff guard baseline
- violations

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
atelier approve
atelier reject --reason "Need smaller slices"
atelier execute
atelier next
atelier done
atelier pause
atelier off
```

## State transitions

Typical flow:

```text
native
  -> discovery
  -> synthesis/design/planning
  -> awaiting_approval
  -> approved
  -> execution
  -> review
  -> done
```

Project code can be edited only when:

```text
state.status = execution
state.approval.status = approved
state.allowed_actions.write_project_code = true
state.current_slice != null
```

## Validation

`atelier validate` checks:

- installation files
- `atelier.json`
- `active.json`
- active epic state
- state/action coherence
- required artifacts
- reviewable plan shape for approval/execution states
- slice goal, acceptance criteria and validation
- premature project-code diffs before execution

Approval-specific validation is enforced by `atelier approve`. It requires:

- active epic exists
- `status=awaiting_approval`
- approval is `none` or `pending`
- `plan.md` exists
- plan has slices
- slices have goals, acceptance criteria and validation
- risks are documented

## Skills

Skills are phase lenses loaded on demand. The adapter should load only the file
named by `active_skill`.

Examples:

- `repo-analyst` writes `research/repo.md`
- `planner` writes `synthesis.md`, `plan.md` and state updates
- `implementer` executes only `current_slice`
- `reviewer` writes `review.md`

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
