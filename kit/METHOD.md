# Atelier-Kit Planning Protocol

By default Atelier is off. Treat `.atelier/active.json` with `"active": false` as
your cue to ignore this kit unless the user invokes `/atelier ...`, asks for
Atelier-Kit by name, or you already know the task belongs to an active epic.

## Source of truth

When active, read these files in order:

1. `.atelier/atelier.json`
2. `.atelier/active.json`
3. `.atelier/epics/<active_epic>/state.json`
4. only the skill named by `active_skill`

Each epic ledger owns its artifacts:

```text
.atelier/epics/<epic>/
├── state.json
├── questions.md
├── research/
├── synthesis.md
├── decisions.md
├── design.md
├── plan.md
└── review.md
```

## Activation

- `/plan ...` is native agent planning. Do not create Atelier artifacts.
- `/atelier quick ...` creates a quick epic.
- `/atelier plan ...` creates a standard epic.
- `/atelier deep ...` creates a deep epic.

## Gates

Atelier guides you through `planned`: by then `plan.md` should stand scrutiny,
slices should be spelled out, and the usual mirror export can happen.

Coding ships via whatever workflow you already use for this agent. When changes
exist on disk, `atelier review` captures how closely reality matches the plan.
