# Atelier-Kit adapter: Codex

Use `AGENTS.md` as the persistent adapter instruction.

- Current state is injected in the `atelier:status` block above (refreshed when state changes); trust it instead of running status commands.
- `/plan ...` stays Codex-native; native-plan hooks may activate Atelier V2 and nudge the same artifact flow.
- `/atelier quick <goal>` bootstraps a quick epic via `.atelier/skills/bootstrap.md`.
- `/atelier plan <goal>` bootstraps a standard epic via `.atelier/skills/bootstrap.md`.
- `/atelier deep <goal>` bootstraps a deep epic via `.atelier/skills/bootstrap.md`.
- When active, read `.atelier/active.json`, then `.atelier/epics/<active_epic>/state.json`, then only the active skill file.
- At `planned`, implement with Codex's native workflow from `.atelier/epics/<active_epic>/plan.md` (or an optional native mirror), then follow `.atelier/skills/reviewer.md` to write `review.md`.
