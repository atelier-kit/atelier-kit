# Atelier-Kit Planning Protocol

Atelier-Kit v2 is inactive by default. Use the host agent's normal behavior
unless the user explicitly activates Atelier with `/atelier ...`, asks to use
Atelier-Kit, or `.atelier/active.json` has `"active": true`.

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

Atelier owns the workflow through `planned`. A planned epic has a validated
`plan.md`, structured slices, and an exported native plan mirror.

Implementation happens in the host agent's native workflow. After
implementation, run `atelier review` to compare the diff and validation evidence
against the planned slices.
