# Atelier-Kit adapter: Cline

Use `.clinerules/atelier-core.md` as the persistent rule file.

- At session start, run `atelier status --inject` if `.atelier/` exists; use its output to load the correct skill.
- Planning stays Cline-native until someone explicitly runs `/atelier ...`.
- `/atelier quick|plan|deep ...` activates Atelier through the `atelier` CLI.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only `.atelier/skills/<active_skill>.md`.
