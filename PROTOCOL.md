# Atelier-Kit Protocol

Atelier-Kit is **planning only**, turned on when you say so. The agent keeps doing
the reasoning; what changes is where artifacts land and what gets validated
before you call a plan finished.

## Activation

- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...` turn Atelier on.
- Saying "Use Atelier-Kit for this feature" counts too.
- `/plan ...` remains host-native by default. If native-plan hooks are installed,
  plan mode can bootstrap an Atelier V2 epic and nudge the host agent through the
  same artifact flow.

While inactive, leave Atelier alone—no epics, no skills, no gates.

## Source of truth

Global activation lives in:

```text
.atelier/active.json
```

The active epic state lives in:

```text
.atelier/epics/<epic-slug>/state.json
```

The protocol does not stash operational state in a separate chat/session dump file.

## CLI

The `atelier` commands are intentionally small. They scaffold folders, install
adapter rules, validate gates, export mirrors, and provide optional lifecycle
helpers. They do not replace the agent-led skill flow.

```bash
atelier init
atelier new "Add payment endpoint" --mode quick
atelier status
atelier validate
atelier validate --gate plan-ready
atelier doctor
atelier render-rules --adapter cursor
atelier export-plan --adapter claude-code
atelier host-plan start "Add payment endpoint"
atelier host-plan finalize
atelier review
atelier next
atelier done
atelier off
```

## Native plan mirrors

Atelier may mirror `plan.md` into host-agent planning files so users can use
Claude Code, Cursor, Kiro, Antigravity or external review tools. Mirrors are
derived artifacts. Canonical plan:

```text
.atelier/epics/<epic-slug>/plan.md
```

`atelier export-plan` writes the mirror. `--command` can invoke tools such as
Plannotator after the file is written, with `ATELIER_PLAN_PATH` pointing at the
mirror file.

When a plan is finalized, the epic becomes `planned` and the configured native
mirror should be exported. The user can then let the host agent implement from
that native plan.

## Planning order

Every Atelier epic starts with questions.

```text
questioner -> repo-analyst -> tech-analyst -> [business-analyst] -> designer -> planner
```

`questioner` writes `questions.md` before research starts. The file may be
refined later, but it cannot remain as the generic seed questions once the
questions task is marked done.

In the simplified flow, the active skill may update `state.json` directly after
writing its artifact. `atelier next` and `atelier done` remain optional helpers,
not the core planning engine.

## Planning gate

`atelier validate --gate plan-ready` requires:

1. An active epic exists.
2. `plan.md` exists.
3. The plan has goal, assumptions, risks and slices.
4. Every slice has a goal, allowed files, acceptance criteria and validation.
5. `state.json` reflects the same reviewable slice structure.

## Implementation and review

After `planned`, Atelier is no longer driving the show. Implement however you
already implement—Cursor, Claude Code, scripts, whatever fits your repo.

Once code exists, run:

```bash
atelier review
```

The review artifact compares the current diff and validation evidence against
the planned slices. If the review is acceptable, `atelier done` marks the epic
`done`; otherwise the user can continue implementing natively and review again.
