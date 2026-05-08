# Atelier-Kit Protocol

Atelier-Kit is an opt-in planning protocol for coding agents.

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

The protocol does not use a session context file as operational state.

## CLI

The CLI is a protocol helper. It creates files, validates invariants and moves
state between explicit lifecycle statuses. It does not replace the host agent's
planning intelligence and does not keep a second planner state model.

```bash
atelier init
atelier new "Add payment endpoint" --mode quick
atelier status
atelier validate
atelier validate --gate plan-ready
atelier doctor
atelier render-rules --adapter cursor
atelier export-plan --adapter claude-code
atelier review
atelier next
atelier done
atelier off
```

## Native plan mirrors

Atelier may mirror `plan.md` into host-agent planning files so users can use
Claude Code, Cursor, Kiro, Antigravity or external review tools. Mirrors are
derived artifacts. The canonical plan remains:

```text
.atelier/epics/<epic-slug>/plan.md
```

`atelier export-plan` writes the mirror. `--command` can invoke tools such as
Plannotator after the file is written, with `ATELIER_PLAN_PATH` pointing at the
mirror file.

When `atelier done` finalizes the planning task, the epic becomes `planned` and
the configured native mirror is exported automatically. The user can then let
the host agent implement from that native plan.

## Planning order

Every Atelier epic starts with questions.

```text
questioner -> repo-analyst -> tech-analyst -> [business-analyst] -> designer -> planner
```

`questioner` writes `questions.md` before research starts. The file may be
refined later, but it cannot remain as the generic seed questions once the
questions task is marked done.

## Planning gate

`atelier validate --gate plan-ready` requires:

1. An active epic exists.
2. `plan.md` exists.
3. The plan has goal, assumptions, risks and slices.
4. Every slice has a goal, allowed files, acceptance criteria and validation.
5. `state.json` reflects the same reviewable slice structure.

## Implementation and review

Atelier stops owning the workflow at `planned`. The native agent may implement
using its own tools, plan files and execution model.

After implementation, run:

```bash
atelier review
```

The review artifact compares the current diff and validation evidence against
the planned slices. If the review is acceptable, `atelier done` marks the epic
`done`; otherwise the user can continue implementing natively and review again.
