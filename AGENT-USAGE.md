# atelier-kit agent usage

atelier-kit is an opt-in Planning Protocol. It extends an agent's native
planning only when the user explicitly activates Atelier.

## Activation rules

- `/plan ...` stays native. Do not create `.atelier/epics`, approval gates or
  Atelier artifacts for native plan mode.
- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...` activate the
  protocol.
- A natural-language request such as "Use Atelier-Kit for this feature" also
  activates the protocol.
- `.atelier/active.json` with `"active": true` means the current task belongs
  to an active Atelier epic.

## CLI commands

Agents can use:

```bash
atelier init
atelier new "Add payment endpoint" --mode quick
atelier status
atelier validate
atelier render-rules --adapter cursor
atelier approve
atelier reject --reason "Need smaller slices"
atelier execute
atelier next
atelier done
atelier pause
atelier resume
atelier off
```

## What the agent should read

When Atelier is inactive, use the host agent's normal behavior.

When Atelier is active, read:

1. `.atelier/atelier.json`
2. `.atelier/active.json`
3. `.atelier/epics/<active_epic>/state.json`
4. only the skill named by `active_skill`

The active epic `state.json` is the source of truth.

## Recommended flows

### Native planning

```text
/plan add this endpoint
```

Expected behavior:

- use the host agent's native planning;
- do not activate Atelier;
- do not create an epic ledger;
- do not enforce approval gates.

### Atelier quick

```text
/atelier quick add this endpoint
```

Expected behavior:

- create an epic ledger;
- create `questions.md`, `research/repo.md`, and `plan.md`;
- stop in `awaiting_approval`;
- wait for human approval before code changes.

### Atelier standard

```text
/atelier plan add payment system
```

Expected behavior:

- create the active epic;
- complete repo, tech, and business research;
- write synthesis, decisions, design, and plan artifacts;
- define slices with allowed files, acceptance criteria, and validation;
- stop for approval.

### Atelier deep

```text
/atelier deep migrate authentication to SSO
```

Expected behavior:

- follow the standard flow;
- add risk register, rollback, test strategy, and critique artifacts;
- require approval before execution.

## Execution behavior

After human approval:

```bash
atelier approve --by human
atelier execute
atelier done
```

`atelier execute` focuses the first ready slice. `atelier done` marks the
current slice done and either focuses the next ready slice automatically or
moves the epic to `review`.

## Pause and native behavior

`atelier pause` preserves the active epic but writes:

```json
{
  "active": false,
  "mode": "native",
  "active_phase": "paused"
}
```

While paused, the agent should behave normally unless the user explicitly
reactivates Atelier.

`atelier resume` reactivates a paused epic. It sets `active: true`,
`mode: "atelier"`, and restores the epic to `planning` so the agent can
continue from where it left off.
