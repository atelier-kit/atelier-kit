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

## No CLI required at runtime

Do everything by reading and writing files. Bootstrap via
`.atelier/skills/bootstrap.md`, follow the active skill, run its gate self-check,
and update `state.json`/`active.json` directly. The `atelier` CLI is optional:

```bash
# Installation (how the files get into a repo)
atelier init
atelier render-rules --adapter cursor
atelier install-adapter claude-code

# Optional deterministic re-checks (agent does these file-based)
atelier validate --gate research-ready   # ≙ researcher self-check
atelier validate --gate plan-ready       # ≙ planner self-check
atelier review                           # ≙ follow reviewer.md
atelier export-plan --adapter claude-code # ≙ copy plan.md to the mirror
```

Never block on a CLI call. If a host cannot run the CLI, the full flow still works
from files alone.

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
Copy `.atelier/epics/<active_epic>/plan.md` into the agent-native destination
yourself; the mirror is not protocol state, so update the Atelier plan and ledger
first, then rewrite the mirror. (`atelier export-plan --adapter <adapter>` does the
same copy as an optional helper.)

Claude Code reads `~/.claude/plans/<epic>.md`; Cursor reads
`.cursor/plans/<epic>.md`. Kiro and Antigravity use workspace-local plan files.

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

- bootstrap the epic file-based via `.atelier/skills/bootstrap.md`; quick mode
  starts directly at `planning` with the `planner` skill;
- record grounding evidence inline in `plan.md` under `## Research Notes`
  (files, symbols, constraints; what exists vs what will be created);
- finalize as `planned` by making `plan.md` and `state.json.slices` pass the
  plan-ready self-check;
- let the native agent implement from the canonical plan (or a mirror you copy).

### Atelier standard

```text
/atelier plan add payment system
```

Expected behavior:

- create the active epic;
- `questioner` writes project-specific questions in the `## Questions` section
  of `research.md` first;
- `researcher` fills the remaining sections of the same consolidated document
  (`## Codebase`, `## Constraints`, `## What exists vs what will be created`,
  `## Open unknowns`), keeping it compact (target 50–300 lines), and passes
  the research-ready self-check (sections present, no `_Pending._`, non-generic
  questions, within budget);
- optionally write `design.md` when tradeoffs need narrowing;
- define slices with allowed files, acceptance criteria, and validation;
- finalize as `planned`; copy a native mirror only if the host wants one.

### Atelier deep

```text
/atelier deep migrate authentication to SSO
```

Expected behavior:

- follow the standard flow;
- `research.md` additionally requires `## Product behavior`;
- `design.md` is required, with decisions recorded as ADRs under `## Decisions`
  plus `## Risk register`, `## Rollback` and `## Test strategy` sections;
- finalize a high-confidence plan for native implementation.

## Review behavior

After the host agent implements from the plan, follow
`.atelier/skills/reviewer.md`: collect the diff against
`state.json.guards.baseline_ref`, build the union of the slices' `allowed_files`,
and write `.atelier/epics/<active_epic>/review.md` with a `## Scope Check`
section listing any changed file outside the allowed patterns. Record those in
`state.json.violations` and justify or flag each as drift. Set the epic to `done`
by editing `state.json` when the review is accepted.

`atelier review` / `atelier done` produce the identical result from the CLI if you
prefer, but neither is required.
