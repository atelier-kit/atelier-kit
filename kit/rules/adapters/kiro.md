# Atelier-Kit adapter: Kiro

Use `.kiro/steering/atelier.md` as the persistent steering file.

- Planning stays Kiro-native until someone explicitly runs `/atelier ...`.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- When active, load only `.atelier/skills/<active_skill>.md`.
