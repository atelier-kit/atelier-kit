# Atelier-Kit adapter: Kilo Code

Use `.kilocode/rules/atelier.md` as the persistent rule file.
Skills are mirrored to `.kilocode/skills/atelier/<skill>.md` for direct loading.

- Current state is injected in the `atelier:status` block above (rendered by `atelier render-rules`); trust it instead of running status commands.
- Planning stays Kilo-native until someone explicitly runs `/atelier ...`.
- `/atelier quick|plan|deep ...` activates Atelier through the `atelier` CLI.
- When active, read `.atelier/active.json` and the active epic `state.json`. Load only the active skill, preferably from `.kilocode/skills/atelier/<active_skill>.md` (mirrored from `.atelier/skills/`).
- Honor the phase gate in `core.md`: do not write artifacts that belong to a later skill, regardless of which Kilo mode is active.
- At `planned`, implement with Kilo's native workflow from the exported plan, then run `atelier review`.
