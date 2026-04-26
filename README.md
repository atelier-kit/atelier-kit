# atelier-kit

Planner-first CLI for AI coding workflows. Installs a `.atelier/` directory with
planning state, **`SKILL.md` skills**, templates, gates, and optional adapters for **Claude Code**,
**Cursor**, **Codex CLI**, **Windsurf**, **Cline**, **Kilo**, **Anti-GRAVITY**, or a
**generic** prompt file.

atelier-kit is a **planner-first framework** built around epics, tasks, slices, approval,
and execution.

In planner workflow, the key primitives are:

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

### Planner-first quickstart

This is the recommended starting point.

```bash
cd your-repo
atelier-kit init
atelier-kit planner autoplan "Migrate Python framework to PHP"
atelier-kit planner present
atelier-kit planner approve
atelier-kit planner execute
```

This path:

1. creates planner state in `.atelier/context.md`
2. turns the objective into repo and tech research tasks, adding business research only for market-research intent
3. synthesizes those tracks into executable slices
4. generates the review plan at `.atelier/plan/<slug-do-plano>/plan.md` (and mirrors it to `.atelier/artifacts/plan.md` for compatibility)
5. stops for approval before implementation

## Planning model

Planner documentation is organized by purpose:

- [PLANNER.md](./PLANNER.md) — planner lifecycle, state, and approval flow
- [EXECUTION-FLOW.md](./EXECUTION-FLOW.md) — diagrammed execution flow from objective to researchers, plan, approval, and slices
- [AGENT-USAGE.md](./AGENT-USAGE.md) — how to use the planner from Claude, Cursor, Codex, Windsurf, Cline, Kilo, Anti-GRAVITY, and generic agents
- [ARCHITECTURE.md](./ARCHITECTURE.md) — internal architecture, state model, runtime, adapters, and artifacts

atelier-kit uses a planner-oriented runtime in `.atelier/context.md`.

- The planner workflow is the product's default flow.
- Artifacts support the graph; they are not the only source of truth.
- Internal runtime fields support routing and adapters; they are not part of the public planner interface.

Recommended relationship between entities:

- **Epic** groups a larger initiative, such as "migrate Python framework to PHP".
- **Task** captures work needed to understand or sequence the initiative, such as repo mapping, tech feasibility, optional market/business discovery, or final synthesis.
- **Slice** is the output of planning: a vertical, executable delivery unit with acceptance checks and dependencies.

In this model:

- the objective creates questions
- questions become role-specific researcher tasks
- tasks answer **what needs to be discovered or decided**
- slices answer **what can be delivered end-to-end next**

The default planner shape is:

```text
objective
  -> repo researcher + tech researcher (+ business researcher for market research)
  -> synthesis / planner
  -> decision / designer
  -> plan.md + design.md
  -> human approval
  -> approved execution slices
```

### Planner workflow example

```bash
atelier-kit planner autoplan "Migrate Python framework to PHP"
atelier-kit planner present
atelier-kit planner approve
atelier-kit planner execute
atelier-kit status
```

The planner operates across two distinct moments:

- **Autoplan**: run repo, tech, optional business, synthesis, and decision tasks until a final plan is ready for human validation
- **Execution**: only begins after approval and focuses approved slices in implementer mode

### Approval flow

When autoplan completes, the planner:

- writes the plan under `.atelier/plan/<slug-do-plano>/` (plus a snapshot and manifest) and mirrors `plan.md` to `.atelier/artifacts/`
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

All supported adapters share the same textual protocol. Inside the agent, you can say:

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

## Core CLI

| Command | Purpose |
|---------|---------|
| `atelier-kit init` | Initialize the planner workspace and install an agent adapter |
| `atelier-kit status` | Show current planner state |
| `atelier-kit install-adapter <name>` | Install or switch the active agent adapter |
| `atelier-kit planner autoplan "<goal>"` | Run planning automatically until a final plan is ready for approval |
| `atelier-kit planner present` | Print the current final plan summary for human validation |
| `atelier-kit planner approve` | Approve the plan and unlock execution |
| `atelier-kit planner reject --reason "..."` | Reject the plan and return to planning |
| `atelier-kit planner execute` | Enter execution mode and focus the first slice |
| `atelier-kit planner next` | Advance focus to the next ready task or slice |
| `atelier-kit planner done` | Mark the current task or slice done and advance |
| `atelier-kit planner validate` | Report planner blockers and concrete next actions |
| `atelier-kit planner validate --repair` | Reconcile planner state from valid artifacts where safe |

### Advanced planner commands

These exist for tighter control, debugging, or maintainers:

- `atelier-kit planner start "<goal>"`
- `atelier-kit planner generate-slices`
- `atelier-kit planner sync-phase`
- `atelier-kit planner epic <add|update|focus>`
- `atelier-kit planner task <add|update|focus>`
- `atelier-kit planner slice <add|update|focus>`
- `atelier-kit mode quick|standard|deep`
- `atelier-kit validate <phase>`
- `atelier-kit return <phase> --reason "..."`
- `atelier-kit handoff`
- `atelier-kit doctor`

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
