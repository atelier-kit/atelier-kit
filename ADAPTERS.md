# Adapter Matrix

Atelier-Kit v2 is a protocol first. Adapters only translate the same protocol into files a host agent already understands.

The universal contract is:

- `/plan ...` remains native host-agent planning.
- `/atelier quick <goal>` runs `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` runs `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` runs `atelier new "<goal>" --mode deep`.
- While active, agents read `.atelier/active.json`, `.atelier/epics/<active_epic>/state.json`, and only `.atelier/skills/<active_skill>.md`.
- Project code cannot be edited before approved execution.

| Agent | Adapter | Rules | Commands | Skills |
|---|---|---|---|---|
| Claude Code | `claude-code` | `CLAUDE.md` | `.claude/commands/atelier.md` | mirrored to `.claude/skills/atelier/` |
| Cursor | `cursor` | `.cursor/rules/atelier-core.mdc` | described in rules | loaded from `.atelier/skills/` |
| Codex CLI | `codex` | `AGENTS.md` | described in rules | loaded from `.atelier/skills/` |
| Gemini CLI | `gemini-cli` | `GEMINI.md` | described in rules | loaded from `.atelier/skills/` |
| Antigravity | `antigravity` | `.antigravity/atelier.md` | described in rules | loaded from `.atelier/skills/` |
| Kiro | `kiro` | `.kiro/steering/atelier.md` | described in steering | loaded from `.atelier/skills/` |
| Kilo Code | `kilo` | `.kilocode/rules/atelier.md` | described in rules | loaded from `.atelier/skills/` |
| Windsurf | `windsurf` | `.windsurfrules` | described in rules | loaded from `.atelier/skills/` |
| Cline | `cline` | `.clinerules/atelier-core.md` | described in rules | loaded from `.atelier/skills/` |
| Generic | `generic` | `atelier-system-prompt.txt` | described in prompt | loaded from `.atelier/skills/` |

Adapters must not promise capabilities the host does not provide. If a host does not support native slash-command files, the adapter installs explicit command mapping instructions instead.
