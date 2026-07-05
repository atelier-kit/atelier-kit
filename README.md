# atelier-kit

Atelier-Kit adds **structure around planning** when you ask for it: artifacts
under `.atelier/`, a ledger per epic, optional mirrors into your agent's native
plan files, and a short review pass after implementation.

Nothing happens until you opt in. `/atelier ...` (or explicitly asking to use
Atelier-Kit) turns the protocol on; until then there are no `.atelier/` writes,
no skills loaded, no gates. Hosts that install native plan hooks can also let
the host's `/plan ...` mode bootstrap a V2 epic and receive framework nudges
while the agent writes the same `.atelier/epics/<epic>/` artifacts.

**The runtime is 100% file-based.** The agent bootstraps epics, runs gate
self-checks, and writes the review entirely by reading and writing files under
`.atelier/` — it never needs the `atelier` CLI. The CLI exists as an optional
convenience: it installs the files (`atelier init`, `render-rules`,
`install-adapter`) and can re-verify state deterministically, but no planning step
depends on it.

While an epic is active, treat these two files as authoritative:

```text
.atelier/active.json
.atelier/epics/<epic-slug>/state.json
```

An epic walks through discovery (questions + research) and design (depending on
mode), planning, then `planned`. After `planned`, coding happens the same way it
would without Atelier—the agent uses its usual workflow. Review at the end
compares what shipped with what was planned, including which files changed
versus each slice's `allowed_files`.

The artifact set is deliberately small — ceremony scales with risk:

| Mode | Artifacts |
|---|---|
| quick | `plan.md` (research inline), `review.md` |
| standard | `research.md`, `plan.md`, `review.md` |
| deep | `research.md`, `design.md`, `plan.md`, `review.md` |

Vocabulary you will see:

- **epic**: the initiative you are planning end to end
- **question**: first section of `research.md`; research should not run on boilerplate questions alone
- **task**: one chunk of the protocol (questions, research, design, planning)
- **slice**: a vertical cut inside `plan.md` with scope, acceptance checks and validation

## Plannotator

Atelier-Kit keeps the CLI small. When
[Plannotator](https://github.com/backnotprop/plannotator) is installed, the
agent uses it directly as a review surface for planning artifacts. Before a
phase is marked done, the active artifact is opened with:

```bash
plannotator annotate .atelier/epics/<epic>/<artifact>.md
```

Any notes from Plannotator are folded back into that artifact before `state.json`
advances. There is no separate Atelier command for this flow.

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

In agent chat, activation is a natural-language cue — the agent bootstraps the
epic file-based by following `.atelier/skills/bootstrap.md`:

```text
/atelier quick add this endpoint
/atelier plan add payments
/atelier deep migrate authentication to SSO
```

The active epic ledger is created at `.atelier/epics/<epic-slug>/`. (If you
prefer, `atelier new "Add payment endpoint" --mode quick` does the same from the
CLI — it is optional.)

### Finish planning and review implementation

The agent advances through the skills, runs each skill's gate self-check, and sets
the epic to `planned` by editing `state.json` — no CLI. After `planned`, implement
through Claude Code, Cursor, Kiro, Antigravity, Codex or another host-agent
workflow. Then the agent follows `.atelier/skills/reviewer.md` to compare the diff
against the plan (including the changed-files × `allowed_files` Scope Check) and
writes `review.md`.

Every step has an optional CLI equivalent (`atelier validate --gate plan-ready`,
`atelier review`, `atelier done`) that re-checks the same rules deterministically,
but none are required to plan.

## Planning protocol

- [PROTOCOL.md](./PROTOCOL.md) — protocol states, files, gates, and commands
- [AGENT-USAGE.md](./AGENT-USAGE.md) — activation and what to read when Atelier is on
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal architecture, state model, adapters, and artifacts

The default protocol shape is:

```text
explicit activation
  -> .atelier/active.json
  -> .atelier/epics/<epic>/state.json
  -> questioner writes the ## Questions section of research.md
  -> researcher fills the remaining sections (one consolidated document)
  -> design.md when the mode schedules it
  -> plan.md with slices (living artifact)
  -> planned
  -> native agent implementation (progress recorded back into plan.md)
  -> review (diff × allowed_files)
```

## Small CLI Surface (optional)

The runtime never requires these; they install the files and offer deterministic
re-checks. The agent performs every runtime action file-based.

| Command | Purpose | File-based equivalent |
|---------|---------|-----------------------|
| `atelier init` | Install the Atelier protocol files | — (installation) |
| `atelier new "<goal>" --mode quick` | Create an active epic ledger | follow `.atelier/skills/bootstrap.md` |
| `atelier validate --gate research-ready` | Re-check research | researcher self-check |
| `atelier validate --gate plan-ready` | Re-check plan | planner self-check |
| `atelier review` | Diff × plan + Scope Check | follow `.atelier/skills/reviewer.md` |
| `atelier next` / `done` / `off` | Advance/finish/disable | edit `state.json` / `active.json` |

Full command reference below (all optional at runtime):

| Command | Purpose |
|---------|---------|
| `atelier init` | Install the Atelier protocol files |
| `atelier install-adapter <name>` | Install adapter files for a host agent |
| `atelier adapter install <name>` | Alias for adapter installation |
| `atelier new "<goal>" --mode quick` | Create an active epic ledger |
| `atelier status` | Show active protocol state |
| `atelier validate` | Validate schemas, state and planning gates |
| `atelier validate --gate research-ready` | Validate that research.md is consolidated, concrete and compact |
| `atelier validate --gate plan-ready` | Validate that the active plan can be finalized |
| `atelier doctor` | Diagnose installation and state |
| `atelier render-rules --adapter cursor` | Write adapter rules |
| `atelier export-plan --adapter claude-code` | Copy the active `plan.md` to the host's plan location |
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
better from its own location, the agent copies `plan.md` there itself (mirrors are
for convenience, not authority). The default Claude Code mirror is
`~/.claude/plans/<epic>.md`; Cursor, Kiro and Antigravity use workspace-local
mirror paths. `atelier export-plan` does the copy as an optional helper, and its
`--command` can chain external tools:

```bash
atelier export-plan --adapter claude-code --command 'plannotator annotate "$ATELIER_PLAN_PATH"'
```

During the normal artifact flow the agent needs no CLI. Before a phase is marked
done, it should open that phase's artifact when Plannotator is installed:
`plannotator annotate .atelier/epics/<epic>/<artifact>.md`. Any notes are folded
into that same artifact before `state.json` is advanced.

Mirrors are derived files. If a native agent changes the plan, update the
canonical Atelier `plan.md` explicitly before finalizing it again.

## License

MIT — see [LICENSE](./LICENSE).

## Credits

See [CREDITS.md](./CREDITS.md).
