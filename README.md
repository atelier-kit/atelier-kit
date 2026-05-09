# atelier-kit

Atelier-Kit adds **structure around planning** when you ask for it: artifacts
under `.atelier/`, a ledger per epic, optional mirrors into your agent's native
plan files, and a short review pass after implementation.

Nothing happens until you opt in. `/atelier ...` (or explicitly asking to use
Atelier-Kit) turns the protocol on; until then there are no `.atelier/` writes,
no skills loaded, no gates. Hosts that install native plan hooks can also let
the host's `/plan ...` mode bootstrap a V2 epic and receive framework nudges
while the agent writes the same `.atelier/epics/<epic>/` artifacts.

While an epic is active, treat these two files as authoritative:

```text
.atelier/active.json
.atelier/epics/<epic-slug>/state.json
```

An epic walks through discovery, synthesis and design (depending on mode),
planning, then `planned`. After `planned`, coding happens the same way it would
without Atelier—the agent uses its usual workflow. Review at the end compares
what shipped with what was planned.

Vocabulary you will see:

- **epic**: the initiative you are planning end to end
- **question**: first artifact; research should not run on boilerplate questions alone
- **task**: one chunk of the protocol (questions, a research track, planning, etc.)
- **slice**: a vertical cut inside `plan.md` with scope, acceptance checks and validation

**Not affiliated with HumanLayer.** See [CREDITS.md](./CREDITS.md).

## Install

```bash
npm install -g @atelier-kit/atelier-kit
```

`atelier-kit` ships a small command-line helper. It initializes the protocol,
installs adapter rules, validates gates, and exports native plan mirrors; the
agent and skills do the planning work.

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

### Use host-native plan mode

```text
/plan add this endpoint
```

Without hooks this remains ordinary host planning. With Atelier native-plan hooks
installed, the first plan-mode prompt creates a V2 epic and injects the active
framework step so the host agent fills `.atelier/epics/<epic>/` through `planned`.

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

After the plan is reviewable, the agent marks the active epic `planned` and
exports a native mirror. The CLI helper can also do the final gate/export step:

```bash
atelier done
```

`atelier done` finalizes the active planning task when you are using the CLI
lifecycle. In the simplified agent-led flow, the active skill updates
`state.json` directly and `atelier validate --gate plan-ready` checks the result.
After `planned`, implement through Claude Code, Cursor, Kiro, Antigravity, Codex
or another host-agent workflow. After implementation:

```bash
atelier review
atelier done
```

`atelier review` records how the current implementation diff matches the plan.

## Planning protocol

- [PROTOCOL.md](./PROTOCOL.md) — protocol states, files, gates, and commands
- [AGENT-USAGE.md](./AGENT-USAGE.md) — activation and what to read when Atelier is on
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal architecture, state model, adapters, and artifacts

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

## Small CLI Surface

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
| `atelier next` | Optional helper to focus the next pending planning task |
| `atelier done` | Optional helper to complete a planning/review task |
| `atelier host-plan start "<goal>"` | Thin helper to create a V2 epic for host-native plan mode |
| `atelier host-plan finalize` | Validate a host-authored plan and export the native mirror |
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

Treat `.atelier/epics/<epic>/plan.md` as canonical. When your agent reads plans
better from its own location, `atelier export-plan` copies there—mirrors are for
convenience, not authority. The default Claude Code mirror is
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
