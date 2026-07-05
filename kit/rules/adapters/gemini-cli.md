# Atelier-Kit adapter: Gemini CLI

Use `GEMINI.md` as the persistent adapter instruction.

- Current state is injected in the `atelier:status` block above (refreshed when state changes); trust it instead of running status commands.
- Planning stays Gemini CLI-native until someone explicitly runs `/atelier ...`.
- `/atelier quick <goal>` bootstraps a quick epic via `.atelier/skills/bootstrap.md`.
- `/atelier plan <goal>` bootstraps a standard epic via `.atelier/skills/bootstrap.md`.
- `/atelier deep <goal>` bootstraps a deep epic via `.atelier/skills/bootstrap.md`.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only the active skill file.
