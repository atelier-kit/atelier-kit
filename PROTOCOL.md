# Atelier-Kit v2 Protocol

## Activation

Atelier-Kit activates only when explicitly requested.

Activation signals:

1. The user uses `/atelier ...`.
2. The user explicitly asks to use Atelier-Kit.
3. `.atelier/active.json` already has `"active": true`.

If none of the above is true, stay in native mode.

## Filesystem state

Global state:

- `.atelier/atelier.json`
- `.atelier/active.json`

Per-epic state:

- `.atelier/epics/<epic>/state.json`
- epic-local planning artifacts such as `questions.md`, `research/*`, `plan.md`, `execution-log.md`, and `review.md`

## Protocol states

Supported states:

- `native`
- `idle`
- `discovery`
- `synthesis`
- `design`
- `planning`
- `awaiting_approval`
- `approved`
- `execution`
- `review`
- `done`
- `blocked`
- `paused`

## Guardrail

When Atelier is active and the epic is not in `execution`, project code edits are forbidden.

The validator enforces this using Git diff against the configured baseline reference.

## Execution model

Execution happens one slice at a time.

- `atelier execute` starts the first ready slice.
- `atelier done` marks the current slice complete.
- `atelier next` focuses the next ready slice.
- once all slices are done, the epic transitions to `review`.
