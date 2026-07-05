# Atelier-Kit adapter: Cursor

Use `.cursor/rules/atelier-core.mdc` as the persistent workspace rule.

- Current state is injected in the `atelier:status` block above (refreshed when state changes); trust it instead of running status commands.
- `/plan ...` stays Cursor-native; native-plan hooks may activate Atelier V2 and nudge the same artifact flow.
- `/atelier quick <goal>` bootstraps a quick epic via `.atelier/skills/bootstrap.md`.
- `/atelier plan <goal>` bootstraps a standard epic via `.atelier/skills/bootstrap.md`.
- `/atelier deep <goal>` bootstraps a deep epic via `.atelier/skills/bootstrap.md`.
- When `.atelier/active.json` is active, read the active epic `state.json` and the active skill.
- Do not load all skills into the prompt. Use only `.atelier/skills/<active_skill>.md`.
