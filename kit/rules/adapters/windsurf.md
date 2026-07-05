# Atelier-Kit adapter: Windsurf

Use `.windsurfrules` as the persistent adapter rule.

- Current state is injected in the `atelier:status` block above (refreshed when state changes); trust it instead of running status commands.
- Planning stays Windsurf-native until someone explicitly runs `/atelier ...`.
- `/atelier quick|plan|deep ...` activates Atelier; bootstrap the epic by following `.atelier/skills/bootstrap.md`.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only `.atelier/skills/<active_skill>.md`.
