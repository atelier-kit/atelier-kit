# Atelier-Kit Planning Protocol

<!-- atelier:status -->
Inactive. (No active epic. This block is refreshed when state changes.)
<!-- /atelier:status -->

Atelier runs **entirely from files** under `.atelier/`. You never need the
`atelier` CLI to plan: bootstrap, gates, review, and finalization are all done by
reading and writing files. The CLI is an optional convenience — it installs these
files and can re-verify state deterministically — but no step below requires it.

## Activation

Atelier is **off** unless one of these is true:

1. The user invoked `/atelier` (or an equivalent phrase such as "use atelier-kit").
2. `.atelier/active.json` has `"active": true`.

When off, ignore `.atelier/` entirely. Do not create artifacts, do not load
skills, do not enforce gates, do not block normal agent behavior.

**To activate a new epic** (`/atelier quick|plan|deep <goal>` or "use
Atelier-Kit") with no epic yet, read `.atelier/skills/bootstrap.md` and follow it
to create the ledger and stubs from files, then continue with the loop below.
**To deactivate** (`/atelier off`), set `.atelier/active.json` to
`{ "active": false, "mode": "native", "active_epic": null, "active_phase": null, "active_skill": null, "updated_at": null }`.

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

| `active_skill` | allowed artifact                             |
|----------------|----------------------------------------------|
| `questioner`   | `research.md` (only the `## Questions` section) |
| `researcher`   | `research.md`                                |
| `designer`     | `design.md`                                  |
| `planner`      | `plan.md`                                    |
| `reviewer`     | `review.md`                                  |

Updates to `state.json` are always allowed (it's the ledger).

If the user asks for work that belongs to a later skill, respond:

> Atelier phase gate: current skill is `<active_skill>` (`<artifact>`).
> Finish that before advancing.

Then resume the current skill. Do not jump ahead even if the next step seems
obvious — early artifacts decay when upstream assumptions change.

The planning order is fixed:

`questioner → researcher → [designer] → planner → reviewer`

`designer` runs only in modes that schedule it (`deep`; optional in `standard`).
`quick` mode skips straight to `planner`: research lives inline in `plan.md`
under `## Research Notes`.

Research quality bar: one consolidated `research.md`, compact (target 50–300
lines), every claim citing a path, symbol, command or source, and explicit
about what already exists vs what will be created.

## Gates are self-checks (no CLI)

Each skill ends with a **self-check gate**: an explicit, mechanical checklist you
verify by reading the artifact before you advance `state.json`. Do not advance
until every item passes. The checks are literal (a heading exists, no
`_Pending._` remains, a line count is within budget, each slice lists
`allowed_files`), so you can audit them yourself.

- **research-ready** (researcher): required sections for the mode are present,
  no `_Pending._` left, the seed questions were replaced, and the file is compact
  (target 50–300 lines).
- **plan-ready** (planner): `plan.md` has goal, assumptions, risks and slices;
  every slice has goal, allowed files, acceptance criteria and validation; the
  same slices are mirrored in `state.json`.

Running `atelier validate --gate <name>` re-checks the same rules deterministically
and is a fine optional double-check, but it is never required to advance.

## Implementation and review

- `status: planned` → switch to the host's native implementation flow. The
  canonical plan is `.atelier/epics/<active_epic>/plan.md`. If your host reads
  plans from a native location, copy `plan.md` there yourself (optional); the
  canonical file stays authoritative.
- During implementation, record per-slice progress back into `plan.md` under
  `## Progress` (the plan is a living artifact).
- `status: review` → follow `.atelier/skills/reviewer.md`: compare the
  implementation diff against `plan.md`, cross-check changed files against each
  slice's `allowed_files` yourself, and write `review.md`.

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

A chat-based "looks good?" is not a substitute. Plannotator either runs at the
boundary or is skipped entirely. (`command -v plannotator` is a host shell check,
not the Atelier CLI.)

## When state disagrees with reality

Pause and report the discrepancy to the user. Do not auto-correct `state.json`
silently. The user resolves it by editing the ledger (optionally re-checking with
`atelier doctor`).

The ledger is `.atelier/epics/<active_epic>/state.json`. Anything else under
`.atelier/` (including `context.md` if present) is not authoritative.
