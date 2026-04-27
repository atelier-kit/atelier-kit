# Atelier-Kit adapter: Kilo Code

Use `.kilocode/rules/atelier.md` as the persistent rule file.

- Native planning remains Kilo behavior unless the user explicitly invokes Atelier.
- `/atelier quick|plan|deep ...` activates Atelier through the `atelier` CLI.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only `.atelier/skills/<active_skill>.md`.
- Do not edit project code before approved execution.
