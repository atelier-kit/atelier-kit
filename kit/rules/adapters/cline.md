# Atelier-Kit adapter: Cline

Use `.clinerules/atelier-core.md` as the persistent rule file.

- Native planning remains Cline behavior unless the user explicitly invokes Atelier.
- `/atelier quick|plan|deep ...` activates Atelier through the `atelier` CLI.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only `.atelier/skills/<active_skill>.md`.
