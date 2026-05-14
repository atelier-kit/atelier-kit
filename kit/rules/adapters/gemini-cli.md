# Atelier-Kit adapter: Gemini CLI

Use `GEMINI.md` as the persistent adapter instruction.

- Current state is injected in the `atelier:status` block above (rendered by `atelier render-rules`); trust it instead of running status commands.
- Planning stays Gemini CLI-native until someone explicitly runs `/atelier ...`.
- `/atelier quick <goal>` maps to `atelier new "<goal>" --mode quick`.
- `/atelier plan <goal>` maps to `atelier new "<goal>" --mode standard`.
- `/atelier deep <goal>` maps to `atelier new "<goal>" --mode deep`.
- When active, read `.atelier/active.json`, the active epic `state.json`, and only the active skill file.
