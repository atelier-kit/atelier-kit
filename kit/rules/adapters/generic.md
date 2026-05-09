# Atelier-Kit adapter: Generic

This adapter exposes the protocol as a portable system prompt.

- `/plan ...` stays native—host planner only; do not create Atelier artifacts until `/atelier ...`.
- `/atelier quick ...`, `/atelier plan ...`, and `/atelier deep ...` activate Atelier.
- If the host does not support slash commands, treat the same text as a normal user request and run the matching `atelier` CLI command.
- Load only `.atelier/skills/<active_skill>.md` while Atelier is active.
- Use `atelier status`, `atelier validate`, and `atelier doctor` whenever state is unclear.
