# Atelier-Kit adapter: Claude Code

Use `CLAUDE.md` and generated command files under `.claude/commands/`.

- Native `/plan ...` remains Claude Code planning and must not activate Atelier.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- After any command that changes state, read `.atelier/active.json` and the active epic `state.json`.
- Load only `.atelier/skills/<active_skill>.md`.
- Stop at `awaiting_approval` and present the plan for human approval.
