# Cursor Adapter

This rule is loaded by Cursor from `.cursor/rules/atelier-core.mdc`.

## Activation

Atelier-Kit activates when:
- The user sends `/atelier quick <goal>`
- The user sends `/atelier plan <goal>`
- The user sends `/atelier deep <goal>`
- `.atelier/active.json` has `"active": true`

## Native plan mode

When the user sends `/plan ...`, use Cursor's native Plan Mode.
Do NOT activate Atelier. Do NOT create `.atelier/epics/`.

## Atelier protocol

When Atelier is active:
1. Open `.atelier/active.json` to find `active_epic` and `active_skill`.
2. Open `.atelier/epics/<active_epic>/state.json`.
3. Load only `.atelier/skills/<active_skill>.md`.
4. Follow the skill instructions precisely.
5. Do not edit project code unless `allowed_actions.write_project_code=true`.

## Commands (map to CLI)

| User says | CLI command |
|---|---|
| `/atelier quick <goal>` | `atelier new "<goal>" --mode quick` |
| `/atelier plan <goal>` | `atelier new "<goal>" --mode standard` |
| `/atelier deep <goal>` | `atelier new "<goal>" --mode deep` |
| `/atelier status` | `atelier status` |
| `/atelier approve` | `atelier approve` |
| `/atelier execute` | `atelier execute` |
| `/atelier next` | `atelier next` |
| `/atelier done` | `atelier done` |
| `/atelier off` | `atelier off` |
