# Atelier-Kit adapter: Codex

Use `AGENTS.md` as the persistent adapter instruction.

- At session start, run `atelier status --inject` if `.atelier/` exists; use its output to load the correct skill.
- `/plan ...` stays Codex-native; native-plan hooks may activate Atelier V2 and nudge the same artifact flow.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- When active, read `.atelier/active.json`, then `.atelier/epics/<active_epic>/state.json`, then only the active skill file.
- At `planned`, implement with Codex's native workflow from the exported plan, then run `atelier review`.
