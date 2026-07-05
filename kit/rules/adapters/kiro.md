# Atelier-Kit adapter: Kiro

Use `.kiro/steering/atelier.md` as the persistent steering file.

- Current state is injected in the `atelier:status` block above (refreshed when state changes); trust it instead of running status commands.
- Planning stays Kiro-native until someone explicitly runs `/atelier ...`.
- `/atelier quick <goal>` bootstraps a quick epic via `.atelier/skills/bootstrap.md`.
- `/atelier plan <goal>` bootstraps a standard epic via `.atelier/skills/bootstrap.md`.
- `/atelier deep <goal>` bootstraps a deep epic via `.atelier/skills/bootstrap.md`.
- When active, load only `.atelier/skills/<active_skill>.md`.
