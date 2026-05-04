# Atelier-Kit adapter: Claude Code

Use `CLAUDE.md` and generated command files under `.claude/commands/`.

- Native `/plan ...` remains Claude Code planning and must not activate Atelier.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- After any command that changes state, read `.atelier/active.json` and the active epic `state.json`.
- Load only `.atelier/skills/<active_skill>.md`.
- Stop at `awaiting_approval`, read `.atelier/epics/<active_epic>/plan.md`, and present that Atelier plan in the chat for human approval.
- Claude's native `/plan` files under `~/.claude/plans/` are not the Atelier source of truth. Do not write them unless the user explicitly asks for a Claude-native mirror.
