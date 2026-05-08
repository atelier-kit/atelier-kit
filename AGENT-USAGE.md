# atelier-kit agent usage

atelier-kit is an opt-in Planning Protocol. It extends an agent's native
planning only when the user explicitly activates Atelier.

## Activation rules

- `/plan ...` stays native. Do not create `.atelier/epics` or Atelier artifacts
  for native plan mode.
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
atelier validate --gate plan-ready
atelier render-rules --adapter cursor
atelier export-plan --adapter claude-code
atelier review
atelier next
atelier done
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

## Native plan mirrors

Agents may use native planning surfaces when they help the user review a plan.
Use `atelier export-plan --adapter <adapter>` to mirror
`.atelier/epics/<active_epic>/plan.md` into an agent-native destination. The
mirror is not protocol state; update the Atelier plan and ledger first, then
export again.

Claude Code exports to `~/.claude/plans/<epic>.md`; Cursor exports to
`.cursor/plans/<epic>.md`. Kiro and Antigravity use workspace-local plan files.
External tools can run through `atelier export-plan --command`.

## Recommended flows

### Native planning

```text
/plan add this endpoint
```

Expected behavior:

- use the host agent's native planning;
- do not activate Atelier;
- do not create an epic ledger;
- do not enforce Atelier gates.

### Atelier quick

```text
/atelier quick add this endpoint
```

Expected behavior:

- create an epic ledger;
- focus `questioner` first and replace generic `questions.md` placeholders;
- create `research/repo.md` and `plan.md`;
- finalize as `planned`;
- let the native agent implement from the exported plan.

### Atelier standard

```text
/atelier plan add payment system
```

Expected behavior:

- create the active epic;
- complete project-specific questions first;
- complete repo and tech research;
- use business research when product/stakeholder impact is material;
- write synthesis, decisions, design, and plan artifacts;
- define slices with allowed files, acceptance criteria, and validation;
- finalize as `planned` and export the native plan mirror.

### Atelier deep

```text
/atelier deep migrate authentication to SSO
```

Expected behavior:

- follow the standard flow;
- require business research;
- add risk register, rollback, test strategy, and critique artifacts;
- finalize a high-confidence plan for native implementation.

## Review behavior

After the host agent implements from the native plan:

```bash
atelier review
atelier done
```

`atelier review` writes `.atelier/epics/<active_epic>/review.md` and sets the
epic to `review`. It should compare the diff and validation evidence against
the planned slices. `atelier done` closes the epic when the review is accepted.
