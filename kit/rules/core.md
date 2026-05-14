# Atelier-Kit Planning Protocol

<!-- atelier:status -->
Inactive. (No active epic. `atelier render-rules` rewrites this block when state changes.)
<!-- /atelier:status -->

## Activation

Atelier is **off** unless one of these is true:

1. The user invoked `/atelier` (or an equivalent phrase such as "use atelier-kit").
2. `.atelier/active.json` has `"active": true`.

When off, ignore `.atelier/` entirely. Do not create artifacts, do not load
skills, do not enforce gates, do not block normal agent behavior.

## When on, the only loop is

1. Read `.atelier/active.json` → confirm `active: true` and get `active_epic`.
2. Read `.atelier/epics/<active_epic>/state.json` → get `active_skill` and `status`.
3. Read `.atelier/skills/<active_skill>.md` (and **only** that skill).
4. Do the work that skill describes.
5. Write the artifact for that skill.
6. Update `state.json` to advance `active_skill` (or set `status` when a phase ended).

No other files inside `.atelier/` are required reading during work. No CLI
calls are required during work. The protocol is file-based at runtime — read
state, follow the active skill, write the artifact, update state.

## Phase gate (hard rule)

The active skill defines the **only artifact** you may write inside the active
epic. Map:

| `active_skill`     | allowed artifact                                  |
|--------------------|---------------------------------------------------|
| `questioner`       | `questions.md`                                    |
| `repo-analyst`     | `research/repo.md`                                |
| `tech-analyst`     | `research/tech.md`                                |
| `business-analyst` | `research/business.md`                            |
| `designer`         | `decisions.md` and `design.md`                    |
| `planner`          | `synthesis.md` and `plan.md`                      |
| `reviewer`         | `review.md`                                       |

Updates to `state.json` are always allowed (it's the ledger).

If the user asks for work that belongs to a later skill, respond:

> Atelier phase gate: current skill is `<active_skill>` (`<artifact>`).
> Finish that before advancing.

Then resume the current skill. Do not jump ahead even if the next step seems
obvious — early artifacts decay when upstream assumptions change.

The planning order is fixed:

`questioner → repo-analyst → tech-analyst → [business-analyst] → designer → planner → reviewer`

`business-analyst` runs only in modes that schedule it (typically `deep`, and
optionally `standard`).

## Implementation and review

- `status: planned` → switch to the host's native implementation flow using the
  exported plan mirror. The canonical plan stays at
  `.atelier/epics/<active_epic>/plan.md`.
- `status: review` → compare the implementation diff against `plan.md` and
  write `review.md`.

## Plannotator (optional, per phase)

Plannotator is a separate tool for human-in-the-loop annotation of any
Atelier artifact. It is **optional** — Atelier never requires it.

The only moment Plannotator may be invoked is **immediately before marking a
phase done** (i.e., before updating `state.json` to advance `active_skill` or
set `status`). Not during edits. Not per task. Once per phase boundary, at
most.

At that moment:

1. Run `command -v plannotator`. If the host does not allow shell or the tool
   is absent, skip — the phase still completes normally.
2. If present, run
   `plannotator annotate .atelier/epics/<active_epic>/<artifact>.md`
   for each artifact owned by the current `active_skill` (see the phase gate
   table above).
3. Fold the user's annotations back into the same artifact.
4. Then update `state.json`.

`atelier status` is not a substitute. A chat-based "looks good?" is not a
substitute. Plannotator either runs at the boundary or is skipped entirely.

## When state disagrees with reality

Pause and report the discrepancy to the user. Do not auto-correct `state.json`
silently. The user (or `atelier doctor`, if they choose) resolves it.

The ledger is `.atelier/epics/<active_epic>/state.json`. Anything else under
`.atelier/` (including `context.md` if present) is not authoritative.
