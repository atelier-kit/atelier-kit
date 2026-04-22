# atelier-kit — operating method

atelier-kit is a planner-first operating model for AI coding agents.

Its core job is to turn a raw goal into:

1. discovery tasks
2. synthesized execution slices
3. a human-reviewable plan
4. approval-gated execution

The planner-oriented state model is built around epics, tasks, and slices.  
**Credit:** Dexter Horthy & HumanLayer documented the core ideas; this file is a clean-room workflow description. **This project is not affiliated with HumanLayer.**

## Principles

1. **Instruction budget:** keep each skill’s `## Instructions` short (≤40 items). Never load every skill at once.
2. **Isolation in research:** the researcher must not read `.atelier/brief.md` — only `.atelier/artifacts/questions.md`.
3. **Unified research in stages:** a single `research.md` with three stages — repository mapping (`[repo]`), external technical research (`[tech]`), and market/UX benchmark (`[market]`). Questions are classified upstream so the researcher knows which evidence each answer needs.
4. **Layered planning:** `design.md` (why/what) → `outline.md` (structure) → `plan.md` (tasks). In planner mode these artifacts become projections of the task graph rather than the only source of truth.
5. **Tasks before slices:** use tasks to investigate, de-risk, and synthesize. Tasks can be parallel and may cover repository, technical, business, or decision work.
6. **Vertical slices:** slices remain the delivery primitive. A slice is the end-to-end unit the implementer ships after planning tasks converge.
7. **Human owns merge:** the agent assists review; the developer approves what ships.

## Planner operating model

The primary path is:

1. receive a goal
2. classify domain (migration, new-feature, refactor, infrastructure, research, or default)
3. create domain-aware discovery tasks with tailored titles, acceptance criteria, and open questions
4. run discovery tracks (repo, tech, business) — modeled as parallel in state
5. synthesize slices
6. generate `plan.md` — includes risk register, dependency map, and open questions
7. stop for approval (validated: synthesis done, slices with goals and acceptance)
8. execute slices after approval

This is the product's intended workflow.

## Planning model

The kit distinguishes four planning concepts:

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

## Internal phase lens

The runtime keeps a `phase` field as an internal signal that helps skills and adapters
resolve the current operating lens (`plan`, `implement`, `review`, ...).

This should be treated as an internal runtime detail, not as the product's primary
workflow model.

In the planner-first product, the authoritative planning model lives in
`.atelier/context.md` as goals, epics, tasks, slices, planner mode, planner state, and
approval state.

## Modes (.atelierrc)

- **quick:** smaller stacks; may skip some planning gates (team choice).
- **standard:** full Questions → … → Review.
- **deep:** strict iteration on design; all gates on returns.

## Session state

Authoritative state lives in `.atelier/context.md` (YAML frontmatter + optional notes). The planner runtime state includes:

- `workflow`: `planner`
- `planner_mode`: `manual` | `autoplan`
- `planner_state`: `idle` | `planning` | `awaiting_approval` | `approved` | `executing`
- `approval_status`: `none` | `pending` | `approved` | `rejected`
- `current_epic`, `current_task`, `current_slice`
- `epics[]`
- `tasks[]` — discovery tasks carry `parallel_group` to identify concurrent tracks
- `slices[]`

This state model exists to support the planner-first runtime.

Read [../PLANNER.md](../PLANNER.md) for the full mental model, lifecycle, and architectural boundaries of planner mode.

CLI: `atelier-kit status`, `atelier-kit return`, `atelier-kit handoff`, planner commands above.

## Ship checklist (suggested)

- [ ] Tests relevant to the change pass.
- [ ] Observability touched if behavior crosses service boundaries.
- [ ] Feature flags / rollout steps documented if applicable.

## CLI reference

See `npx atelier-kit --help`.
