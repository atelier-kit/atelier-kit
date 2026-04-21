# atelier-kit

Skills-first CLI for **RPI / QRSPI**-style agent workflows. Installs a `.atelier/` directory with **`SKILL.md` skills**, templates, gates, and optional adapters for **Claude Code**, **Cursor**, **Codex CLI**, **Windsurf**, or a **generic** prompt file.

The current workflow is phase-oriented, but the session state can also represent a planner model built around **epics**, **tasks**, and **slices**:

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

```bash
cd your-repo
npx atelier-kit init
```

Answer prompts (agent target + mode). Then:

1. Edit `.atelier/brief.md`.
2. `atelier-kit phase questions` (or say `/questions` in-agent) — tag each question with `[repo]`, `[tech]`, or `[market]`.
3. `atelier-kit phase research` — produces a single `research.md` with stages for repo, tech, and market.
4. Work through phases; use `atelier-kit status` anytime.

## Planning model

atelier-kit can express both a phased workflow and a planner workflow in `.atelier/context.md`.

- **Phased workflow** keeps the current RPI/QRSPI behavior intact.
- **Planner workflow** keeps the same skills and artifacts, but treats them as support for a task graph instead of the only source of truth.

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
atelier-kit workflow planner
atelier-kit epic add python-to-php "Migrate Python framework to PHP" --goal "Preserve incremental delivery"
atelier-kit task add repo-discovery python-to-php repo "Map current framework coupling"
atelier-kit task add tech-feasibility python-to-php tech "Compare PHP framework candidates"
atelier-kit task add business-impact python-to-php business "Capture rollout and team impact"
atelier-kit task focus tech-feasibility
atelier-kit slice add auth-migration python-to-php "Migrate authentication vertically" --goal "Login/session/authz in PHP" --from-task tech-feasibility
atelier-kit status
```

In planner mode, the active skill is derived from the focused task:

- `repo` -> `repo-analyst`
- `tech` -> `tech-analyst`
- `business` -> `business-analyst`
- `synthesis` -> `planner`
- `implementation` -> `implementer`
- `decision` -> `designer`

## CLI

| Command | Purpose |
|---------|---------|
| `atelier-kit init` | Create `.atelier/` + install adapter |
| `atelier-kit workflow <phased|planner>` | Switch workflow model in `.atelier/context.md` |
| `atelier-kit phase <name>` | Set `phase` in `.atelier/context.md` |
| `atelier-kit status` | Print session state |
| `atelier-kit return <phase> --reason "..."` | Roll back with recorded reason |
| `atelier-kit mode quick\|standard\|deep` | Default mode in `.atelierrc` |
| `atelier-kit handoff` | Dump context + artifact excerpts |
| `atelier-kit doctor` | Run all validators |
| `atelier-kit validate <phase>` | Validate one phase |
| `atelier-kit install-adapter <name>` | Switch adapter outputs |
| `atelier-kit epic <add|update|focus>` | Manage planner epics |
| `atelier-kit task <add|update|focus>` | Manage planner tasks |
| `atelier-kit slice <add|update|focus>` | Manage planner slices |

## Compatibility

| Agent | Mechanism |
|-------|-----------|
| Claude Code | `.claude/skills/` + `CLAUDE.md` |
| Cursor | `.cursor/skills/` + `.cursor/rules/atelier-core.mdc` |
| Codex CLI | `AGENTS.md` |
| Windsurf | `.windsurfrules` |
| Generic | `atelier-system-prompt.txt` |

## License

MIT — see [LICENSE](./LICENSE).

## Credits

See [CREDITS.md](./CREDITS.md).
