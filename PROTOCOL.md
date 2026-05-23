# Atelier-Kit Protocol

Atelier-Kit is **planning only**, turned on when you say so. The agent keeps doing
the reasoning; what changes is where artifacts land and what gets validated
before you call a plan finished.

The CLI surface, adapter matrix, and native plan mirror behavior live in
[README.md](./README.md); this document is the protocol contract: states,
gates, and source-of-truth files.

## Activation

- `/atelier quick ...`, `/atelier plan ...`, `/atelier deep ...` turn Atelier on.
- Saying "Use Atelier-Kit for this feature" counts too.
- `/plan ...` stays host-native. Atelier never intercepts host plan mode.

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

## Planning order

Every Atelier epic starts with questions.

```text
questioner -> repo-analyst -> tech-analyst -> [business-analyst] -> designer -> planner
```

`questioner` writes `questions.md` before research starts. The file may be
refined later, but it cannot remain as the generic seed questions once the
questions task is marked done.

The active skill updates `state.json` directly after writing its artifact.
There are no CLI helpers for advancing tasks — the agent owns the ledger.

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
the planned slices. If the review is acceptable, the agent advances the epic
to `done` in `state.json`; otherwise it continues implementing natively and
runs `atelier review` again.
