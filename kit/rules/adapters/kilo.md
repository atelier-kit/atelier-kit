# Atelier-Kit adapter: Kilo Code

Use `.kilocode/rules/atelier.md` as the persistent rule file.

- At session start, run `atelier status --inject` if `.atelier/` exists; use its output to load the correct skill.
- Planning stays Kilo-native until someone explicitly runs `/atelier ...`.
- `/atelier quick|plan|deep ...` activates Atelier through the `atelier` CLI.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only `.atelier/skills/<active_skill>.md`.
- At `planned`, implement with Kilo's native workflow from the exported plan, then run `atelier review`.
