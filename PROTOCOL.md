# Atelier-Kit v2 Protocol

Atelier-Kit v2 is an opt-in planning protocol for coding agents.

## Activation

- `/plan ...` remains the host agent's native planning mode.
- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...` activate Atelier.
- "Use Atelier-Kit for this feature" also activates Atelier.

When inactive, Atelier must not create epics, load skills, or enforce gates.

## Source of truth

Global activation lives in:

```text
.atelier/active.json
```

The active epic state lives in:

```text
.atelier/epics/<epic-slug>/state.json
```

The v2 protocol does not use the old session context file as operational state.

## CLI

```bash
atelier init
atelier new "Add payment endpoint" --mode quick
atelier status
atelier validate
atelier doctor
atelier render-rules --adapter cursor
atelier approve
atelier reject --reason "Need smaller slices"
atelier execute
atelier next
atelier done
atelier pause
atelier off
```

## Approval invariant

Project code can be edited only when:

1. Atelier is active.
2. The epic status is `execution`.
3. `approval.status` is `approved`.
4. `allowed_actions.write_project_code` is true.
5. `current_slice` is set.

