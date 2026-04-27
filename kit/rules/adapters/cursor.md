# Atelier-Kit (Cursor) — v2

- **Native planning:** `/plan ...` uses Cursor plan mode only. No `.atelier/` epic unless the user explicitly uses Atelier.
- **Atelier:** When the user uses `/atelier quick|plan|deep ...` or asks for Atelier-Kit, run `atelier new "<title>" --mode <quick|standard|deep>` then follow `.atelier/active.json` and epic `state.json`.
- **State:** Authoritative epic state is `.atelier/epics/<slug>/state.json`, not `context.md`.
- **Skills:** Load only the file named by `active_skill` under `.atelier/skills/` (e.g. `repo-analyst.md`).
- **CLI:** Prefer `atelier status`, `atelier validate`, `atelier approve`, `atelier execute` from the terminal when workspace protocol state must change.
