# Atelier-Kit adapter: Codex

Use `AGENTS.md` as the persistent adapter instruction.

- Native `/plan ...` remains Codex behavior and must not activate Atelier.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- When active, read `.atelier/active.json`, then `.atelier/epics/<active_epic>/state.json`, then only the active skill file.
- Do not edit project code until state is `execution` and approval is `approved`.
