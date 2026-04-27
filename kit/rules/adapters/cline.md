# Cline Adapter

This rule is loaded by Cline from `.clinerules/atelier-core.md`.

## Atelier-Kit Planning Protocol

Atelier-Kit is inactive by default.

Activate only when:
- The user explicitly uses `/atelier`
- `.atelier/active.json` has `"active": true`

When active:
1. Read `.atelier/active.json` for `active_epic` and `active_skill`.
2. Read `.atelier/epics/<active_epic>/state.json`.
3. Load only the required skill from `.atelier/skills/`.
4. Do not edit project code unless `allowed_actions.write_project_code=true`.

## Commands

| User says | CLI command |
|---|---|
| `/atelier quick <goal>` | `atelier new "<goal>" --mode quick` |
| `/atelier plan <goal>` | `atelier new "<goal>" --mode standard` |
| `/atelier approve` | `atelier approve` |
| `/atelier execute` | `atelier execute` |
| `/atelier off` | `atelier off` |
