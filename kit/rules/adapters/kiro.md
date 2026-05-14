# Atelier-Kit adapter: Kiro

Use `.kiro/steering/atelier.md` as the persistent steering file.

- Current state is injected in the `atelier:status` block above (rendered by `atelier render-rules`); trust it instead of running status commands.
- Planning stays Kiro-native until someone explicitly runs `/atelier ...`.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- When active, load only `.atelier/skills/<active_skill>.md`.
