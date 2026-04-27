# Atelier-Kit adapter: Cursor

Use `.cursor/rules/atelier-core.mdc` as the persistent workspace rule.

- Native `/plan ...` remains Cursor behavior and must not activate Atelier.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- When `.atelier/active.json` is active, read the active epic `state.json` and the active skill.
- Do not load all skills into the prompt. Use only `.atelier/skills/<active_skill>.md`.
