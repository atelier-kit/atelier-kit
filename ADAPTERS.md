# Adapter Matrix

Each adapter is a thin localization layer: same rules underneath, different paths
and filenames so Claude Code, Cursor, Codex, etc. can ingest them without drama.

The universal contract is:

- `/plan ...` stays host-native. If native-plan hooks are installed, it can
  bootstrap a V2 epic and nudge the same skill/artifact flow.
- `/atelier quick <goal>` runs `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` runs `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` runs `atelier new "<goal>" --mode deep`.
- While active, agents read `.atelier/active.json`, `.atelier/epics/<active_epic>/state.json`, and only `.atelier/skills/<active_skill>.md`.
- The agent may advance task state directly in `state.json`; `atelier next` and
  `atelier done` are helpers, not the orchestration engine.
- Project code stays untouched while the epic is in discovery, synthesis, design
  or planning. At `planned`, Atelier hands implementation back to the host
  agent's native workflow.

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

Do not advertise slash-command installs where the host cannot actually mount them—fallback instructions beat broken promises.
