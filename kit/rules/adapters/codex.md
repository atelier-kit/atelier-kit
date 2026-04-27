# Codex Adapter

This rule is loaded by Codex CLI from `AGENTS.md`.

## Atelier-Kit Planning Protocol

Atelier-Kit is inactive by default. Use native behavior for all tasks unless:
- The user explicitly uses `/atelier`
- `.atelier/active.json` has `"active": true`

When Atelier is active:
1. Read `.atelier/active.json`.
2. Read `.atelier/epics/<active_epic>/state.json`.
3. Load only the skill in `active_skill`.
4. Do not edit project code unless `allowed_actions.write_project_code=true`.

## Commands

| User says | CLI command |
|---|---|
| `/atelier quick <goal>` | `atelier new "<goal>" --mode quick` |
| `/atelier plan <goal>` | `atelier new "<goal>" --mode standard` |
| `/atelier approve` | `atelier approve` |
| `/atelier execute` | `atelier execute` |
| `/atelier off` | `atelier off` |
