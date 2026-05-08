# Atelier-Kit adapter: Windsurf

Use `.windsurfrules` as the persistent adapter rule.

- Planning stays Windsurf-native until someone explicitly runs `/atelier ...`.
- `/atelier quick|plan|deep ...` activates Atelier through the `atelier` CLI.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only `.atelier/skills/<active_skill>.md`.
