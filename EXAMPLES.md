# Examples — native vs Atelier

## Native plan (no Atelier)

User:

```text
/plan add OAuth2 to the API
```

Expected: the agent uses **Cursor / host native** planning. It should **not** create `.atelier/epics/`, change `active.json` to active, or load `.atelier/skills/*.md` for protocol work.

## Atelier quick

User:

```text
/atelier quick fix the null pointer in checkout
```

Flow:

1. Run `atelier new "fix the null pointer in checkout" --mode quick`
2. Work through `state.json` (discovery → … → awaiting approval)
3. Smaller artifact set (see `kit/protocol/modes.yaml`)

## Atelier standard

User:

```text
/atelier plan add payment system
```

Use `--mode standard`. Full research tracks (repo, tech, business), synthesis, design, plan, approval gate.

## Atelier deep

User:

```text
/atelier deep migrate authentication to SSO
```

Use `--mode deep`. Adds risk register, rollback, test strategy, critique artifacts per `modes.yaml`.

## After approval

```bash
atelier approve
atelier execute
# implement current slice only
atelier done
atelier next   # when another slice is ready
```
