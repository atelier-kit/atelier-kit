# atelier-kit

Atelier-Kit is an opt-in, filesystem-native Planning Protocol for coding agents.
It extends an agent's native planning mode only when explicitly activated, then
persists planning state, approval gates, skills, and slice execution under
`.atelier/`.

Atelier-Kit is inactive by default:

- `/plan ...` remains the host agent's native plan mode.
- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...`, or "Use
  Atelier-Kit for this feature" activate the protocol.
- When inactive, Atelier creates no artifacts, loads no skills, and enforces no
  gates.

When active, the source of truth is the active epic ledger:

```text
.atelier/active.json
.atelier/epics/<epic-slug>/state.json
```

Each epic moves through discovery, synthesis/design/planning, approval,
execution, review, and done. Project code edits are forbidden before human
approval and execution mode.

In Atelier protocol mode, the key primitives are:

- **epic**: the business or technical initiative being planned
- **task**: a unit of discovery, analysis, decision, or implementation planning
- **slice**: a vertical delivery cut derived from planning tasks and executed end-to-end

**Not affiliated with HumanLayer.** See [CREDITS.md](./CREDITS.md).

## Install

```bash
npm install -g @atelier-kit/atelier-kit
```

`atelier-kit` is intended to be used as a command-line tool. A global install
makes the `atelier-kit` command available in your shell.

## Quickstart

### Initialize the protocol

```bash
cd your-repo
atelier init
```

This installs `.atelier/atelier.json`, `.atelier/active.json`, protocol files,
rules, skills, schemas, and adapter instructions. `active.json` starts inactive:

```json
{
  "active": false,
  "mode": "native",
  "active_epic": null
}
```

### Use native plan mode

```text
/plan add this endpoint
```

Expected behavior: native agent planning only. Atelier remains inactive.

### Activate Atelier explicitly

```bash
atelier new "Add payment endpoint" --mode quick
atelier status
atelier validate
```

In agent chat, the equivalent activation is:

```text
/atelier quick add this endpoint
/atelier plan add payments
/atelier deep migrate authentication to SSO
```

The active epic ledger is created at `.atelier/epics/<epic-slug>/`.

### Approval and execution

After the plan is reviewable and human-approved:

```bash
atelier approve --by human
atelier execute
atelier done
atelier next
```

Execution runs one approved slice at a time. `atelier validate` reports invalid
state, missing artifacts, bad gates, and project-code diffs before approval.

## Planning protocol

- [PROTOCOL.md](./PROTOCOL.md) — protocol states, files, gates, and commands
- [AGENT-USAGE.md](./AGENT-USAGE.md) — how agents should activate and obey Atelier
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal architecture, state model, runtime, adapters, and artifacts

The default protocol shape is:

```text
explicit activation
  -> .atelier/active.json
  -> .atelier/epics/<epic>/state.json
  -> questions and research artifacts
  -> plan.md with slices
  -> awaiting_approval
  -> approved execution, one slice at a time
  -> review
```

## Core CLI

| Command | Purpose |
|---------|---------|
| `atelier init` | Install the v2 protocol files |
| `atelier new "<goal>" --mode quick` | Create an active epic ledger |
| `atelier status` | Show active protocol state |
| `atelier validate` | Validate schemas, state, gates and premature diffs |
| `atelier doctor` | Diagnose installation and state |
| `atelier render-rules --adapter cursor` | Write adapter rules |
| `atelier approve` | Approve only a reviewable `awaiting_approval` plan |
| `atelier reject --reason "..."` | Reject the plan and return to planning |
| `atelier execute` | Enter approved execution and focus the first slice |
| `atelier next` | Focus the next ready slice |
| `atelier done` | Complete the current slice and advance |
| `atelier pause` | Pause Atelier and return agent behavior to native mode |
| `atelier resume` | Resume a paused epic and reactivate the protocol |
| `atelier off` | Disable Atelier |

## Adapter outputs

`atelier render-rules --adapter <name>` writes the protocol rules for the
selected host:

| Agent | Output |
|-------|--------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursor/rules/atelier-core.mdc` |
| Codex CLI | `AGENTS.md` |
| Windsurf | `.windsurfrules` |
| Cline | `.clinerules/atelier-core.md` |
| Generic | `AGENTS.md` |

## License

MIT — see [LICENSE](./LICENSE).

## Credits

See [CREDITS.md](./CREDITS.md).
