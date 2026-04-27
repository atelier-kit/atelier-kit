# Atelier-Kit v2 — Planning protocol

Atelier-Kit v2 is an **opt-in, filesystem-native planning protocol**. It does not replace the host agent’s native plan mode.

## Activation

| Trigger | Behavior |
|--------|------------|
| `/plan ...` | **Native** planning only. No Atelier epics, no `.atelier/epics/` unless you choose otherwise. |
| `/atelier quick\|plan\|deep ...` or explicit request | **Atelier** protocol: create an epic with `atelier new`, then follow `state.json`. |

## Source of truth

- Global: `.atelier/atelier.json`, `.atelier/active.json`
- Per epic: `.atelier/epics/<slug>/state.json`

`context.md` may still exist for the **legacy planner** (`atelier-kit planner ...`); v2 epic workflow uses `state.json`.

## States

Epic `status` values include: `discovery`, `synthesis`, `design`, `planning`, `awaiting_approval`, `approved`, `execution`, `review`, `done`, `blocked`, `paused`, plus `idle` / `native` as needed.

Project code edits are disallowed until `status=execution` with human approval and a `current_slice`.

## CLI

Prefer the `atelier` command (same package as `atelier-kit`):

- `atelier init` — install protocol tree
- `atelier new "<title>" --mode quick|standard|deep`
- `atelier status`, `atelier validate`, `atelier doctor`
- `atelier render-rules --adapter cursor`
- `atelier approve`, `atelier reject --reason "..."`, `atelier execute`, `atelier next`, `atelier done`, `atelier pause`, `atelier off`

Legacy phased + planner CLI remains under `atelier-kit`.
