# atelier-kit agent usage

Use Atelier **only when the user asks** or when a native plan hook has already
activated an Atelier V2 epic for the host's plan mode. Outside that, behave like
the host tool already tells you to.

## Activation rules

- `/plan ...` stays host-native unless an installed native-plan hook activates a
  V2 epic. When that happens, keep using the host plan UI but persist work in
  `.atelier/epics/<active_epic>/`.
- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...` activate the
  protocol.
- A natural-language request such as "Use Atelier-Kit for this feature" also
  activates the protocol.
- `.atelier/active.json` with `"active": true` means the current task belongs
  to an active Atelier epic.

## CLI helpers

Prefer the active skill instructions and update the active epic ledger directly.
Use the CLI only for setup, validation, mirror export, review, or optional
lifecycle help:

```bash
atelier init
atelier new "Add payment endpoint" --mode quick
atelier status
atelier validate
atelier validate --gate plan-ready
atelier render-rules --adapter cursor
atelier export-plan --adapter claude-code
atelier host-plan start "Add payment endpoint"
atelier host-plan finalize
atelier review
atelier next
atelier done
atelier off
```

## What the agent should read

When Atelier is off, skip `.atelier/` entirely.

When it is on, read these before improvising:

1. `.atelier/atelier.json`
2. `.atelier/active.json`
3. `.atelier/epics/<active_epic>/state.json`
4. only the skill named by `active_skill`

If something disagrees, trust the active epic `state.json`.

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

- without native-plan hooks, use the host agent's native planning and do not
  create Atelier artifacts;
- with native-plan hooks, create or reuse a V2 epic, follow the active skill,
  and persist artifacts under `.atelier/epics/<active_epic>/`;
- continue only through `planned`; implementation remains native.

### Atelier quick

```text
/atelier quick add this endpoint
```

Expected behavior:

- create or reuse the active V2 epic ledger;
- focus `questioner` first and replace generic `questions.md` placeholders;
- create `research/repo.md` and `plan.md`;
- finalize as `planned` by making `plan.md` and `state.json.slices` pass the
  plan-ready gate;
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
