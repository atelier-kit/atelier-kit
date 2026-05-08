# atelier-kit

Atelier-Kit is an opt-in, filesystem-native Planning Protocol for coding agents.
It extends an agent's native planning mode only when explicitly activated, then
persists planning state, skills, native plan mirrors, and review artifacts under
`.atelier/`.

The CLI is deliberately small. It initializes protocol files, validates gates,
renders adapter instructions, exports native plan files, and performs lifecycle
state transitions; it does not run a separate planner, keep a second session
context, or execute implementation work.

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

Each epic moves through discovery, synthesis/design/planning, `planned`,
optional review, and done. `planned` is the handoff boundary: the host agent
implements using its own native workflow.

In Atelier protocol mode, the key primitives are:

- **epic**: the business or technical initiative being planned
- **question**: the first planning artifact; research cannot start while it is generic
- **task**: a unit of questions, discovery, analysis, decision, or implementation planning
- **slice**: a vertical delivery cut derived from planning tasks and executed end-to-end

**Not affiliated with HumanLayer.** See [CREDITS.md](./CREDITS.md).

## Install

```bash
npm install -g @atelier-kit/atelier-kit
```

`atelier-kit` is intended to be used as a command-line tool. A global install
makes the `atelier` command available in your shell. The legacy `atelier-kit`
binary remains available.

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

### Finish planning and review implementation

After the plan is reviewable:

```bash
atelier done
```

`atelier done` finalizes the active planning task, moves the epic to `planned`,
and exports the configured native plan mirror. Implement through Claude Code,
Cursor, Kiro, Antigravity, Codex or another host-agent workflow. After
implementation:

```bash
atelier review
atelier done
```

`atelier review` records how the current implementation diff matches the plan.

## Planning protocol

- [PROTOCOL.md](./PROTOCOL.md) — protocol states, files, gates, and commands
- [AGENT-USAGE.md](./AGENT-USAGE.md) — how agents should activate and obey Atelier
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal architecture, state model, runtime, adapters, and artifacts

The default protocol shape is:

```text
explicit activation
  -> .atelier/active.json
  -> .atelier/epics/<epic>/state.json
  -> questioner writes questions.md
  -> research artifacts
  -> design decisions
  -> plan.md with slices
  -> planned
  -> native agent implementation
  -> review
```

## Core CLI

| Command | Purpose |
|---------|---------|
| `atelier init` | Install the Atelier protocol files |
| `atelier install-adapter <name>` | Install adapter files for a host agent |
| `atelier adapter install <name>` | Alias for adapter installation |
| `atelier new "<goal>" --mode quick` | Create an active epic ledger |
| `atelier status` | Show active protocol state |
| `atelier validate` | Validate schemas, state and planning gates |
| `atelier validate --gate plan-ready` | Validate that the active plan can be finalized |
| `atelier doctor` | Diagnose installation and state |
| `atelier render-rules --adapter cursor` | Write adapter rules |
| `atelier export-plan --adapter claude-code` | Mirror the active `plan.md` to an agent-native plan file |
| `atelier review` | Review the current implementation diff against the planned epic |
| `atelier next` | Focus the next pending planning task |
| `atelier done` | Complete a planning task, finalize a plan, or close a reviewed epic |
| `atelier off` | Disable Atelier |

## Adapter outputs

`atelier render-rules --adapter <name>` writes the protocol rules for the
selected host:

| Agent | Adapter | Output |
|-------|---------|--------|
| Claude Code | `claude-code` | `CLAUDE.md`, `.claude/commands/atelier.md`, `.claude/skills/atelier/*.md` |
| Cursor | `cursor` | `.cursor/rules/atelier-core.mdc` |
| Codex CLI | `codex` | `AGENTS.md` |
| Gemini CLI | `gemini-cli` | `GEMINI.md` |
| Antigravity | `antigravity` | `.antigravity/atelier.md` |
| Kiro | `kiro` | `.kiro/steering/atelier.md` |
| Kilo Code | `kilo` | `.kilocode/rules/atelier.md` |
| Windsurf | `windsurf` | `.windsurfrules` |
| Cline | `cline` | `.clinerules/atelier-core.md` |
| Generic | `generic` | `atelier-system-prompt.txt` |

See [ADAPTERS.md](./ADAPTERS.md) for the adapter capability matrix.

## Native plan mirrors

Atelier's source of truth remains `.atelier/epics/<epic>/plan.md`. When a host
agent has useful native planning tools, `atelier export-plan` can mirror that
plan into the agent's expected location. The default Claude Code mirror is
`~/.claude/plans/<epic>.md`; Cursor, Kiro and Antigravity use workspace-local
mirror paths unless `--path` is provided.

External review tools can be chained after export:

```bash
atelier export-plan --adapter claude-code --command 'plannotator annotate "$ATELIER_PLAN_PATH"'
```

Mirrors are derived files. If a native agent changes the plan, update the
canonical Atelier `plan.md` explicitly before finalizing it again.

## License

MIT — see [LICENSE](./LICENSE).

## Credits

See [CREDITS.md](./CREDITS.md).
