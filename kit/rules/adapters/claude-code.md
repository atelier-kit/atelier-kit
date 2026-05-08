# Atelier-Kit adapter: Claude Code

Use `CLAUDE.md` and generated command files under `.claude/commands/`.

- Native `/plan ...` remains Claude Code planning and must not activate Atelier.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- After any command that changes state, read `.atelier/active.json` and the active epic `state.json`.
- Load only `.atelier/skills/<active_skill>.md`.
- At `planned`, use the exported Claude plan under `~/.claude/plans/` for native implementation.
- Claude's native `/plan` files are mirrors, not the Atelier source of truth. Keep `.atelier/epics/<active_epic>/plan.md` canonical.
