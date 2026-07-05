# Atelier-Kit Planning Protocol

Atelier-Kit v2 is inactive by default. Treat `.atelier/active.json` with
`"active": false` as your cue to ignore this kit unless the user invokes
`/atelier ...`, asks for Atelier-Kit by name, or you already know the task
belongs to an active epic.

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
├── research.md   (standard/deep — questions + evidence, consolidated)
├── design.md     (deep; optional in standard — decisions embedded as ADRs)
├── plan.md       (living contract; quick mode keeps research inline here)
└── review.md
```

## Activation

- `/plan ...` is host-native planning. Without native-plan hooks, do not create
  Atelier artifacts; with hooks, persist the same V2 artifacts under the active
  epic.
- `/atelier quick ...` creates a quick epic.
- `/atelier plan ...` creates a standard epic.
- `/atelier deep ...` creates a deep epic.

## Gates

Atelier guides you through `planned`: by then `plan.md` should stand scrutiny and
slices should be spelled out. Gates are **self-checks** each skill runs against
its own artifact (research-ready, plan-ready) — no CLI is required to pass them.

Coding ships via whatever workflow you already use for this agent. When changes
exist on disk, follow `.atelier/skills/reviewer.md` to compare reality against the
plan (compute changed-files × allowed_files yourself and write `review.md`).

The `atelier` CLI is optional: it installs these files and can re-verify state
deterministically, but the protocol runs entirely from files.
