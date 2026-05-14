# Atelier-Kit adapter: Generic

This adapter exposes the protocol as a portable system prompt.

- `/plan ...` stays host-native; native-plan hooks may activate Atelier V2 and nudge the same artifact flow.
- `/atelier quick ...`, `/atelier plan ...`, and `/atelier deep ...` activate Atelier.
- If the host does not support slash commands, treat the same text as a normal user request and run the matching `atelier` CLI command.
- Load only `.atelier/skills/<active_skill>.md` while Atelier is active.
- Current state is injected at the top of this file (see the `atelier:status` block in `core.md`); trust it instead of guessing.
- Use `atelier status`, `atelier validate`, and `atelier doctor` whenever state is unclear.
