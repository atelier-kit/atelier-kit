# Atelier-Kit v2 — Rules

## Core Rule

Atelier-Kit is **inactive by default**.

Use the host agent's normal behavior unless one of these is true:

1. The user explicitly uses `/atelier`.
2. The user asks to use Atelier-Kit.
3. `.atelier/active.json` has `"active": true`.
4. The current task belongs to an active Atelier epic.

### When Atelier-Kit is inactive

- Do not create Atelier artifacts.
- Do not enforce Atelier gates.
- Do not block normal agent behavior.
- Do not load Atelier skills.

### When Atelier-Kit is active

1. Read `.atelier/atelier.json`.
2. Read `.atelier/active.json`.
3. Read `.atelier/epics/<active_epic>/state.json`.
4. Load only the skill required by `active_skill`.
5. If `allowed_actions.write_project_code` is false, do not edit project code.
6. If `status` is `awaiting_approval`, present `plan.md` and stop.
7. If `status` is `execution`, execute only `current_slice`.
8. After each protocol step, update the corresponding artifact and `state.json`.

Never invent missing state. If protocol state is missing or inconsistent, stop and request repair through `atelier validate` or `atelier doctor`.

---

## Rendering Rules

Generate rules for your agent environment:

```bash
atelier render-rules --adapter cursor
atelier render-rules --adapter claude-code
atelier render-rules --adapter codex
atelier render-rules --adapter cline
atelier render-rules --adapter windsurf
atelier render-rules --adapter generic
```

The rendered file includes the core rule plus any adapter-specific overlays.

---

## Adapter Targets

| Adapter | File |
|---|---|
| `cursor` | `.cursor/rules/atelier-core.mdc` |
| `claude-code` | `.claude/CLAUDE.md` |
| `codex` | `AGENTS.md` |
| `cline` | `.clinerules/atelier-core.md` |
| `windsurf` | `.windsurfrules` |
| `generic` | `atelier-system-prompt.txt` |
