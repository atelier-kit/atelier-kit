# atelier-kit

Atelier-Kit v2 is a filesystem-native planning protocol for coding agents.

It is **inactive by default**. Native agent behavior, including `/plan`, should stay untouched unless the user explicitly activates Atelier with commands like `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...`, or directly asks to use Atelier-Kit.

## Product thesis

Atelier-Kit turns native agent planning into an auditable engineering workflow with:

- explicit activation;
- files as protocol state;
- on-demand skills;
- approval gates;
- slice-based execution;
- validation and diagnostics.

## Install

```bash
npm install -g @atelier-kit/atelier-kit
```

The package exposes both `atelier` and `atelier-kit` as CLI commands.

## Quickstart

```bash
cd your-repo
atelier init
atelier status
atelier new "Add payment endpoint" --mode quick
```

At this point Atelier becomes active for the new epic and writes the initial ledger under:

```text
.atelier/epics/add-payment-endpoint/
```

## Core behavior

### Native mode remains native

```text
/plan add this endpoint
```

Expected behavior:

- native host-agent planning;
- no Atelier artifacts;
- no protocol activation.

### Atelier quick mode

```text
/atelier quick add this endpoint
```

Expected behavior:

- create an epic ledger;
- create quick planning artifacts;
- stop for approval before implementation.

## Installed structure

`atelier init` installs the v2 protocol layout:

```text
.atelier/
├── atelier.json
├── active.json
├── protocol/
├── rules/
├── skills/
├── schemas/
└── epics/
```

The source of truth for active work is:

```text
.atelier/epics/<epic-slug>/state.json
```

## Commands

```bash
atelier init
atelier status
atelier new "Add payment endpoint" --mode quick
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

## Workflow summary

1. `atelier init` installs the protocol files and adapter rules.
2. `atelier new` creates an epic ledger and activates Atelier.
3. The agent populates discovery, design, and plan artifacts under the epic directory.
4. `atelier approve` marks the plan as approved.
5. `atelier execute` starts the first ready slice.
6. `atelier next` advances to the next ready slice.
7. `atelier done` marks the current slice as done.
8. `atelier validate` and `atelier doctor` verify protocol correctness.

## Invariants

The most important invariants are:

1. Atelier-Kit is inactive by default.
2. `/plan` does not activate Atelier.
3. `.atelier/active.json` controls activation.
4. Each epic owns its own `state.json`.
5. Project code cannot be edited before approval when Atelier is active.

## More docs

- [PROTOCOL.md](./PROTOCOL.md)
- [CLI.md](./CLI.md)
- [LICENSE](./LICENSE)
