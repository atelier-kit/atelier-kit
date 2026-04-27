# Claude Code Adapter

This rule is loaded by Claude Code from `.claude/CLAUDE.md`.

## Activation

Atelier-Kit activates when:
- The user explicitly uses `/atelier`
- The user asks to use Atelier-Kit
- `.atelier/active.json` has `"active": true`

## Native plan mode

When the user sends `/plan ...`, use Claude's native planning capabilities.
Do NOT activate Atelier. Do NOT create `.atelier/epics/`.

## Atelier protocol

When Atelier is active:
1. Read `.atelier/active.json` to find `active_epic` and `active_skill`.
2. Read `.atelier/epics/<active_epic>/state.json`.
3. Load only `.atelier/skills/<active_skill>.md`.
4. Follow all skill instructions and forbidden action rules.
5. Do not edit project code unless `allowed_actions.write_project_code=true`.
6. After each step, update the relevant artifact and `state.json`.

## Commands

| User says | CLI command |
|---|---|
| `/atelier quick <goal>` | `atelier new "<goal>" --mode quick` |
| `/atelier plan <goal>` | `atelier new "<goal>" --mode standard` |
| `/atelier deep <goal>` | `atelier new "<goal>" --mode deep` |
| `/atelier status` | `atelier status` |
| `/atelier approve` | `atelier approve` |
| `/atelier execute` | `atelier execute` |
| `/atelier off` | `atelier off` |
