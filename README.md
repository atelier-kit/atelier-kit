# atelier-kit v2

**Filesystem-native planning protocol for coding agents.**

Atelier-Kit v2 turns native agent planning into an auditable engineering workflow.

> Atelier-Kit is inactive by default.  
> When active, no project code can be edited before human approval.

**Not affiliated with HumanLayer.** See [CREDITS.md](./CREDITS.md).

---

## Product Thesis

Atelier-Kit v2 is a filesystem-native planning protocol with:

- small, explicit activation rules
- on-demand skills
- explicit state
- approval gates
- slice-based execution

It extends — not replaces — the native plan mode of coding agents.

---

## Install

```bash
npm install -g @atelier-kit/atelier-kit
```

The global install makes both `atelier` and `atelier-kit` commands available.

---

## Quickstart

```bash
cd your-repo
atelier init
atelier render-rules --adapter cursor
atelier new "Add payment endpoint" --mode quick
# agent runs discovery → research → planning
atelier validate
atelier approve
atelier execute
atelier done
atelier next
```

---

## Activation

Atelier-Kit activates **only** when explicitly requested.

| User says | Behavior |
|---|---|
| `/plan add this endpoint` | Native agent plan mode. No Atelier. |
| `/atelier quick add this endpoint` | Atelier protocol — quick mode |
| `/atelier plan add payments` | Atelier protocol — standard mode |
| `/atelier deep migrate auth to SSO` | Atelier protocol — deep mode |

---

## Planning Modes

| Mode | Use for | Max slices |
|---|---|---|
| `quick` | Small, low-risk changes | 3 |
| `standard` | Normal features, full research | — |
| `deep` | High-risk architectural changes | — |

---

## CLI

| Command | Responsibility |
|---|---|
| `atelier init` | Install `.atelier/`, protocol, rules, skills, schemas |
| `atelier status` | Show active mode, epic, phase, skill, approval state |
| `atelier new "<title>" --mode <mode>` | Create a new epic ledger and activate Atelier |
| `atelier validate` | Validate schemas, gates and protocol violations |
| `atelier doctor` | Diagnose installation and broken state |
| `atelier render-rules --adapter <name>` | Generate rules for Cursor, Claude Code, Codex, etc. |
| `atelier approve` | Mark pending plan as approved |
| `atelier reject --reason "..."` | Reject plan and return to planning |
| `atelier execute` | Start execution after approval |
| `atelier next` | Move to next slice |
| `atelier done` | Mark current slice as done |
| `atelier pause` | Pause Atelier without deleting the active epic |
| `atelier off` | Disable Atelier (return to native mode) |

---

## Adapter Support

| Agent | Mechanism | Adapter name |
|---|---|---|
| Cursor | `.cursor/rules/atelier-core.mdc` | `cursor` |
| Claude Code | `.claude/CLAUDE.md` | `claude-code` |
| Codex CLI | `AGENTS.md` | `codex` |
| Cline | `.clinerules/atelier-core.md` | `cline` |
| Windsurf | `.windsurfrules` | `windsurf` |
| Generic | `atelier-system-prompt.txt` | `generic` |

---

## `.atelier` Structure

```text
.atelier/
├── atelier.json          ← global config
├── active.json           ← activation state
├── protocol/             ← workflow, gates, modes, skills definitions
├── rules/                ← core rule + adapter overlays
├── skills/               ← on-demand agent skill files
├── schemas/              ← JSON schemas for validation
└── epics/
    └── <epic-slug>/
        ├── state.json    ← single source of truth for the epic
        ├── questions.md
        ├── research/
        ├── synthesis.md
        ├── design.md
        ├── plan.md
        ├── execution-log.md
        └── review.md
```

---

## Documentation

- [PROTOCOL.md](./PROTOCOL.md) — protocol states, transitions, and invariants
- [RULES.md](./RULES.md) — core rule and activation logic
- [SKILLS.md](./SKILLS.md) — on-demand skill descriptions
- [GATES.md](./GATES.md) — approval gates and guard rules
- [ADAPTERS.md](./ADAPTERS.md) — per-agent adapter instructions
- [EXAMPLES.md](./EXAMPLES.md) — end-to-end usage examples
- [CLI.md](./CLI.md) — CLI command reference

---

## License

MIT — see [LICENSE](./LICENSE).

## Credits

See [CREDITS.md](./CREDITS.md).
