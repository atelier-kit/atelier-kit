# Atelier-Kit adapter: Codex

Use `AGENTS.md` as the persistent adapter instruction.

- `/plan ...` is unchanged—still Codex's built-in planner; do not activate Atelier.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- When active, read `.atelier/active.json`, then `.atelier/epics/<active_epic>/state.json`, then only the active skill file.
- At `planned`, implement with Codex's native workflow from the exported plan, then run `atelier review`.
