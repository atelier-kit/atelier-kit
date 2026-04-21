# atelier-kit

Skills-first CLI for AI coding workflows. Installs a `.atelier/` directory with
**`SKILL.md` skills**, templates, gates, and optional adapters for **Claude Code**,
**Cursor**, **Codex CLI**, **Windsurf**, **Cline**, **Kilo**, **Anti-GRAVITY**, or a
**generic** prompt file.

atelier-kit currently supports **two operating models**:

- **Planner workflow** — the newer control-plane model built around epics, tasks, slices,
  approval, and execution
- **Phased workflow** — the older RPI / QRSPI-style flow kept for compatibility

In planner workflow, the key primitives are:

- **epic**: the business or technical initiative being planned
- **task**: a unit of discovery, analysis, decision, or implementation planning
- **slice**: a vertical delivery cut derived from planning tasks and executed end-to-end

**Not affiliated with HumanLayer.** See [CREDITS.md](./CREDITS.md).

## Install

```bash
pnpm add -D atelier-kit
# or
npx atelier-kit@latest init
```

## Quickstart

### Planner-first quickstart

This is the recommended path when you want the framework to act like a planner.

```bash
cd your-repo
npx atelier-kit init
atelier-kit planner autoplan "Migrate Python framework to PHP"
atelier-kit planner present
atelier-kit planner approve
atelier-kit planner execute
```

This path:

1. creates planner state in `.atelier/context.md`
2. runs discovery and synthesis
3. generates `.atelier/artifacts/plan.md`
4. stops for approval before implementation

### Phased quickstart

Use this only if you explicitly want the older phased workflow.

```bash
cd your-repo
npx atelier-kit init
```

Then:

1. Edit `.atelier/brief.md`.
2. `atelier-kit phase questions` (or say `/questions` in-agent) — tag each question with `[repo]`, `[tech]`, or `[market]`.
3. `atelier-kit phase research` — produces a single `research.md` with stages for repo, tech, and market.
4. Work through phases; use `atelier-kit status` anytime.

`brief.md` belongs to the phased workflow. It is **not required** for the planner-first flow.

## Planning model

Planner documentation is now split by purpose:

- [PLANNER.md](./PLANNER.md) — mental model, lifecycle, and planner philosophy
- [AGENT-USAGE.md](./AGENT-USAGE.md) — how to use the planner from Claude, Cursor, Codex, Windsurf, Cline, Kilo, Anti-GRAVITY, and generic agents
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal architecture, state model, runtime, adapters, and artifacts

atelier-kit can express both a phased workflow and a planner workflow in `.atelier/context.md`.

- **Planner workflow** is the primary planning model.
- **Phased workflow** keeps the older RPI/QRSPI behavior intact for teams that still want it.
- In planner workflow, artifacts support the graph; they are not the only source of truth.

Recommended relationship between entities:

- **Epic** groups a larger initiative, such as "migrate Python framework to PHP".
- **Task** captures work needed to understand or sequence the initiative, such as repo mapping, tech feasibility, business impact, or final synthesis.
- **Slice** is the output of planning: a vertical, executable delivery unit with acceptance checks and dependencies.

In this model:

- tasks answer **what needs to be discovered or decided**
- slices answer **what can be delivered end-to-end next**
- phases remain useful as compatibility and operator guidance

### Planner workflow example

```bash
atelier-kit planner autoplan "Migrate Python framework to PHP"
atelier-kit planner present
atelier-kit planner approve
atelier-kit planner execute
atelier-kit status
```

The planner now supports two distinct moments:

- **Autoplan**: run discovery and synthesis automatically until a final plan is ready for human validation
- **Execution**: only begins after approval and focuses approved slices in implementer mode

### Approval flow

When autoplan completes, the planner:

- generates `.atelier/artifacts/plan.md`
- sets `planner_state=awaiting_approval`
- sets `approval_status=pending`
- clears active task/slice focus so the plan can be reviewed

From there:

```bash
atelier-kit planner present
atelier-kit planner approve
atelier-kit planner execute
```

or, if changes are needed:

```bash
atelier-kit planner reject --reason "Need a lower-risk rollout plan"
```

Execution is blocked until approval.

In planner mode, the active skill is derived from the focused task:

- `repo` -> `repo-analyst`
- `tech` -> `tech-analyst`
- `business` -> `business-analyst`
- `synthesis` -> `planner`
- `implementation` -> `implementer`
- `decision` -> `designer`

### Triggering the planner from an agent

All supported adapters now share the same textual protocol. Inside the agent, you can say:

```text
/planner migrate Python framework to PHP
/planner present
/planner approve
/planner execute
/planner status
```

The adapter instructions tell the agent to translate those commands into:

- `atelier-kit planner autoplan "<goal>"`
- `atelier-kit planner present`
- `atelier-kit planner approve`
- `atelier-kit planner execute`
- `atelier-kit status`

After every state-changing command, the agent is instructed to re-read `.atelier/context.md` and continue with the newly active skill.

## CLI

| Command | Purpose |
|---------|---------|
| `atelier-kit init` | Create `.atelier/` + install adapter |
| `atelier-kit phase <name>` | Set `phase` in `.atelier/context.md` |
| `atelier-kit status` | Print session state |
| `atelier-kit return <phase> --reason "..."` | Roll back with recorded reason |
| `atelier-kit mode quick\|standard\|deep` | Default mode in `.atelierrc` |
| `atelier-kit handoff` | Dump context + artifact excerpts |
| `atelier-kit doctor` | Run all validators |
| `atelier-kit validate <phase>` | Validate one phase |
| `atelier-kit install-adapter <name>` | Switch adapter outputs |
| `atelier-kit planner workflow <phased\|planner>` | Switch workflow model |
| `atelier-kit planner start "<goal>"` | Create an epic and starter tasks from a goal |
| `atelier-kit planner autoplan "<goal>"` | Run planning automatically until a final plan is ready for approval |
| `atelier-kit planner present` | Print the current final plan summary for human validation |
| `atelier-kit planner approve` | Approve proposed slices and unlock execution |
| `atelier-kit planner reject --reason "..."` | Reject the proposed plan and return to planning |
| `atelier-kit planner execute` | Enter execution mode and focus the first approved slice |
| `atelier-kit planner next` | Advance focus to the next ready task or slice |
| `atelier-kit planner done` | Mark the current task or slice done and advance |
| `atelier-kit planner generate-slices` | Generate initial slices from completed synthesis work |
| `atelier-kit planner sync-phase` | Recompute phase from planner focus |
| `atelier-kit planner epic <add\|update\|focus>` | Manage planner epics |
| `atelier-kit planner task <add\|update\|focus>` | Manage planner tasks |
| `atelier-kit planner slice <add\|update\|focus>` | Manage planner slices |

## Compatibility

| Agent | Mechanism |
|-------|-----------|
| Claude Code | `.claude/skills/` + `CLAUDE.md` |
| Cursor | `.cursor/skills/` + `.cursor/rules/atelier-core.mdc` |
| Codex CLI | `AGENTS.md` |
| Windsurf | `.windsurfrules` |
| Cline | `.clinerules/atelier-core.md` |
| Kilo | `.kilocode/rules/atelier-core.md` + `AGENTS.md` |
| Anti-GRAVITY | `.agent/rules/atelier-core.md` + `AGENTS.md` |
| Generic | `atelier-system-prompt.txt` |

## License

MIT — see [LICENSE](./LICENSE).

## Credits

See [CREDITS.md](./CREDITS.md).
