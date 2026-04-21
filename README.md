# atelier-kit

Skills-first CLI for **RPI / QRSPI**-style agent workflows. Installs a `.atelier/` directory with **`SKILL.md` skills**, templates, gates, and optional adapters for **Claude Code**, **Cursor**, **Codex CLI**, **Windsurf**, or a **generic** prompt file.

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
