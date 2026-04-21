# atelier-kit — operating method

atelier-kit helps AI coding agents follow a disciplined workflow inspired by **Research–Plan–Implement (RPI)** and its expanded form (**QRSPI**). The current kit ships a phased workflow and now defines a planner-oriented state model built around epics, tasks, and slices.  
**Credit:** Dexter Horthy & HumanLayer documented the core ideas; this file is a clean-room workflow description. **This project is not affiliated with HumanLayer.**

## Principles

1. **Instruction budget:** keep each skill’s `## Instructions` short (≤40 items). Never load every skill at once.
2. **Isolation in research:** the researcher must not read `.atelier/brief.md` — only `.atelier/artifacts/questions.md`.
3. **Unified research in stages:** a single `research.md` with three stages — repository mapping (`[repo]`), external technical research (`[tech]`), and market/UX benchmark (`[market]`). Questions are classified upstream so the researcher knows which evidence each answer needs.
4. **Layered planning:** `design.md` (why/what) → `outline.md` (structure) → `plan.md` (tasks). In planner mode these artifacts become projections of the task graph rather than the only source of truth.
5. **Tasks before slices:** use tasks to investigate, de-risk, and synthesize. Tasks can be parallel and may cover repository, technical, business, or decision work.
6. **Vertical slices:** slices remain the delivery primitive. A slice is the end-to-end unit the implementer ships after planning tasks converge.
7. **Human owns merge:** the agent assists review; the developer approves what ships.

## Planning model

The kit now distinguishes four planning concepts:

- **Epic:** strategic container for a larger initiative, often larger than one iteration.
- **Task:** planning or execution work item; can represent repo mapping, technical research, business discovery, synthesis, implementation prep, or decisions.
- **Slice:** a vertical delivery unit produced by planning. Slices should be small enough to ship end-to-end and depend on resolved tasks.
- **Sprint:** optional scheduling context. A sprint may contain multiple epics or tasks, but it is not the primary planning primitive.

Recommended relationship:

1. User goal opens or updates an **epic**.
2. Planner creates parallel **tasks** to answer repo, tech, and business questions.
3. Planner synthesizes those tasks into executable **slices**.
4. Implementer ships one slice at a time.

Operational commands for planner mode:

- `atelier-kit planner workflow planner`
- `atelier-kit planner autoplan "<goal>"`
- `atelier-kit planner start "<goal>"` (manual mode)
- `atelier-kit planner present`
- `atelier-kit planner approve`
- `atelier-kit planner reject --reason "..."`
- `atelier-kit planner execute`
- `atelier-kit planner next`
- `atelier-kit planner done`
- `atelier-kit planner generate-slices`
- `atelier-kit planner sync-phase`
- `atelier-kit planner epic add --id <id> --title "..." [--goal "..."]`
- `atelier-kit planner task add --id <id> --epic <epic-id> --type repo|tech|business|synthesis|implementation|decision --title "..."`
- `atelier-kit planner slice add --id <id> --epic <epic-id> --title "..." --goal "..."`
- `atelier-kit planner epic|task|slice focus <id>`
- `atelier-kit planner workflow phased`

Agent trigger protocol:

- `/planner <goal>` -> run `atelier-kit planner autoplan "<goal>"`
- `/planner present` -> run `atelier-kit planner present`
- `/planner approve` -> run `atelier-kit planner approve`
- `/planner reject` -> run `atelier-kit planner reject --reason "<reason>"`
- `/planner execute` -> run `atelier-kit planner execute`
- `/planner next` -> run `atelier-kit planner next`
- `/planner done` -> run `atelier-kit planner done`
- `/planner status` -> run `atelier-kit status`
- `/slice start` -> run `atelier-kit planner next` and continue if a slice becomes active
- After every mutating planner command, re-read `.atelier/context.md` before proceeding

## Phases & trigger phrases

| Phase | Typical triggers | Primary artifact(s) |
|-------|------------------|---------------------|
| brief | `/brief` | `.atelier/brief.md` (human-led; agent may assist) |
| questions | `/questions` | `.atelier/artifacts/questions.md` (scoped `[repo] [tech] [market]`) |
| research | `/research` | `.atelier/artifacts/research.md` (3 stages: repo / tech / market) |
| design | `/design` | `.atelier/artifacts/design.md` |
| outline | `/outline`, `/approve-design` | `.atelier/artifacts/outline.md` |
| plan | `/plan`, `/approve-outline` | `.atelier/artifacts/plan.md` |
| implement | `/implement` | code + `.atelier/artifacts/impl-log.md` |
| review | `/review`, `/approve` | `.atelier/artifacts/review.md` |
| ship | `/ship` | release checklist (project-defined) |
| learn | `/learn` | `.atelier/artifacts/decision-log.md` |

Use `atelier-kit phase <name>` to force phase when the agent does not auto-select a skill. In planner-oriented sessions, `phase` remains useful as an operational lens, but the authoritative planning model can live in `.atelier/context.md` as epics, tasks, and slices.

## Modes (.atelierrc)

- **quick:** smaller stacks; may skip some planning gates (team choice).
- **standard:** full Questions → … → Review.
- **deep:** strict iteration on design; all gates on returns.

## Session state

Authoritative state lives in `.atelier/context.md` (YAML frontmatter + optional notes). The state now supports:

- `workflow`: `phased` or `planner`
- `planner_mode`: `manual` | `autoplan`
- `planner_state`: `idle` | `planning` | `awaiting_approval` | `approved` | `executing`
- `approval_status`: `none` | `pending` | `approved` | `rejected`
- `current_epic`, `current_task`, `current_slice`
- `epics[]`
- `tasks[]`
- `slices[]`

This allows teams to preserve the phased workflow while gradually moving planning to task graphs.

Read [../PLANNER.md](../PLANNER.md) for the full mental model, lifecycle, and architectural boundaries of planner mode.

CLI: `atelier-kit status`, `atelier-kit return`, `atelier-kit handoff`, planner commands above.

## Ship checklist (suggested)

- [ ] Tests relevant to the change pass.
- [ ] Observability touched if behavior crosses service boundaries.
- [ ] Feature flags / rollout steps documented if applicable.

## CLI reference

See `npx atelier-kit --help`.
