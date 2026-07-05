# Atelier-Kit adapter: Kilo Code

Use `.kilocode/rules/atelier.md` as the persistent rule file.
Skills are mirrored to `.kilocode/skills/atelier/<skill>.md` for direct loading.

- Current state is injected in the `atelier:status` block above (refreshed when state changes); trust it instead of running status commands.
- Planning stays Kilo-native until someone explicitly runs `/atelier ...`.
- `/atelier quick|plan|deep ...` activates Atelier; bootstrap the epic by following `.atelier/skills/bootstrap.md`.
- When active, read `.atelier/active.json` and the active epic `state.json`. Load only the active skill, preferably from `.kilocode/skills/atelier/<active_skill>.md` (mirrored from `.atelier/skills/`).
- Honor the phase gate in `core.md`: do not write artifacts that belong to a later skill, regardless of which Kilo mode is active.
- At `planned`, implement with Kilo's native workflow from `.atelier/epics/<active_epic>/plan.md` (or an optional native mirror), then follow `.atelier/skills/reviewer.md` to write `review.md`.
