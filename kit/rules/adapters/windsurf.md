# Atelier-Kit adapter: Windsurf

Use `.windsurfrules` as the persistent adapter rule.

- Native planning remains Windsurf behavior unless the user explicitly invokes Atelier.
- `/atelier quick|plan|deep ...` activates Atelier through the `atelier` CLI.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only `.atelier/skills/<active_skill>.md`.
