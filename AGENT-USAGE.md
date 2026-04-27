# atelier-kit agent usage

atelier-kit v2 is an opt-in Planning Protocol. It should extend an agent's
native planning only when the user explicitly activates Atelier.

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
atelier off
```

## What the agent should read

When Atelier is inactive, use the host agent's normal behavior.

When Atelier is active, read:

1. `.atelier/atelier.json`
2. `.atelier/active.json`
3. `.atelier/epics/<active_epic>/state.json`
4. only the skill named by `active_skill`

The epic `state.json` is the source of truth.

## Recommended day-to-day flows

### 1. Fast planning flow

Use this when you want a plan draft quickly.

Human says:

```text
/planner migrate Python framework to PHP
```

Agent should:

1. run `atelier-kit planner autoplan "migrate Python framework to PHP"`
2. re-read `.atelier/context.md`
3. notice `planner_state=awaiting_approval`
4. present the final plan or point the human to `plan.md`

Then the human chooses:

```text
/planner approve
```

or:

```text
/planner reject
```

If approved:

```text
/planner execute
```

### 2. Manual planning flow

Use this when the planning process needs tighter supervision.

Human says:

```text
/planner start migrate Python framework to PHP
```

Then advances the flow manually:

```text
/planner done
/planner next
/planner present
/planner approve
/planner execute
```

This is useful for higher-risk work where the human wants to inspect intermediate steps.

### 3. Slice execution flow

Once execution has started, the planner focuses slices rather than planning tasks.

Typical interaction:

```text
/planner execute
/slice start
/planner done
```

Here `/slice start` means "advance to the next ready slice through the planner
CLI"; it does not bypass planner approval or state transitions.

At this point the agent should be operating with the implementer skill.

## How to think about the agent's job

The agent has three responsibilities:

### A. Obey the planner state

The agent should treat `.atelier/context.md` as authoritative for:

- workflow
- planner_mode
- planner_state
- approval_status
- current_task
- current_slice

### B. Use the right skill

The planner state tells the agent which behavior mode is active.

Common examples:

- current task is `repo` -> use repo analyst behavior
- current task is `tech` -> use tech analyst behavior
- current task is `business` -> use business analyst behavior
- current task is `synthesis` -> use planner behavior
- current slice is active during execution -> use implementer behavior
- planner is awaiting approval -> use planner behavior

### C. Never bypass the CLI for state transitions

The agent can reason freely, but it should not invent its own state mutation protocol.

Use the CLI for:

- starting the planner
- approving or rejecting
- entering execution
- marking work done
- advancing focus

## What the human should expect from the agent

If the integration is working correctly, the agent should:

- understand `/planner <goal>`
- run the appropriate CLI command
- reload planner state
- continue in the correct role
- stop for approval before implementation starts

If the agent starts implementing before approval, that is a protocol violation.

## Per-agent notes

### Claude Code

Repository-local guidance is written to:

- `CLAUDE.md`
- `.claude/skills/`

Expectation:

- read `CLAUDE.md`
- read `.atelier/context.md`
- infer the correct skill
- follow the common planner command protocol

### Cursor

Repository-local guidance is written to:

- `.cursor/rules/atelier-core.mdc`
- `.cursor/skills/`

Expectation:

- Cursor reads the workspace rule
- the rule tells the agent to inspect planner state
- the agent maps commands like `/planner approve` to the CLI

### Codex CLI

Repository-local guidance is written to:

- `AGENTS.md`

Expectation:

- Codex follows `AGENTS.md`
- command translation stays the same as in other environments

### Windsurf

Repository-local guidance is written to:

- `.windsurfrules`

Expectation:

- the agent reads Windsurf rules plus planner state
- the command protocol remains the same

### Cline

Repository-local guidance is written to:

- `.clinerules/atelier-core.md`

Expectation:

- Cline reads the rule file
- the rule points it back to `.atelier/context.md`
- the agent uses the same planner commands

### Kilo

Repository-local guidance is written to:

- `.kilocode/rules/atelier-core.md`
- `AGENTS.md`

Expectation:

- Kilo can use both project rules and AGENTS-style instructions
- the planner protocol remains identical

### Anti-GRAVITY

Repository-local guidance is written to:

- `.agent/rules/atelier-core.md`
- `AGENTS.md`
- `GEMINI.md`

Expectation:

- the agent has multiple surfaces to discover the same protocol
- the CLI remains the mutation layer

### Generic

Repository-local guidance is written to:

- `atelier-system-prompt.txt`

Expectation:

- use this when the host agent does not have a dedicated adapter
- the same planner command protocol applies

## Recommended prompts for humans

### Start planning

```text
/planner migrate Python framework to PHP
```

### Ask for the current plan state

```text
/planner status
```

### Present the plan explicitly

```text
/planner present
```

### Approve the plan

```text
/planner approve
```

### Reject the plan with a revision request

```text
/planner reject
Need a smaller first slice and clearer rollout risk
```

### Start implementation

```text
/planner execute
```

## Troubleshooting

### The agent is using the wrong skill

Check:

- did the agent re-read `.atelier/context.md`?
- is `current_task` or `current_slice` set correctly?
- is the adapter installed for the current environment?

### The agent starts coding before approval

Check:

- is `planner_state` stuck in `planning` instead of `awaiting_approval`?
- did the human call `/planner approve`?
- is the agent ignoring adapter instructions?

### The agent does not understand `/planner`

Check:

- did you run `atelier-kit init`?
- is the correct adapter installed?
- does the repository contain the generated adapter files?

## Minimal operator rule

If you want one short operational sentence for teams, use this:

> Talk to the agent in planner commands, let the agent mutate state through the CLI,
> and expect the planner to stop at approval before execution begins.
