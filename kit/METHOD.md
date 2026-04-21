# atelier-kit — operating method

atelier-kit helps AI coding agents follow a disciplined, phased workflow inspired by **Research–Plan–Implement (RPI)** and its expanded form (**QRSPI**).  
**Credit:** Dexter Horthy & HumanLayer documented the core ideas; this file is a clean-room workflow description. **This project is not affiliated with HumanLayer.**

## Principles

1. **Instruction budget:** keep each skill’s `## Instructions` short (≤40 items). Never load every skill at once.
2. **Isolation in research:** the researcher must not read `.atelier/brief.md` — only `.atelier/artifacts/questions.md`.
3. **Layered planning:** `design.md` (why/what) → `outline.md` (structure) → `plan.md` (tasks). Separate human review between them.
4. **Vertical slices:** implement **one slice** end-to-end (stack layers together) before starting the next.
5. **Human owns merge:** the agent assists review; the developer approves what ships.

## Phases & trigger phrases

| Phase | Typical triggers | Primary artifact(s) |
|-------|------------------|---------------------|
| brief | `/brief` | `.atelier/brief.md` (human-led; agent may assist) |
| questions | `/questions` | `.atelier/artifacts/questions.md` |
| research | `/research` | `.atelier/artifacts/research.md` |
| design | `/design` | `.atelier/artifacts/design.md` |
| outline | `/outline`, `/approve-design` | `.atelier/artifacts/outline.md` |
| plan | `/plan`, `/approve-outline` | `.atelier/artifacts/plan.md` |
| implement | `/implement` | code + `.atelier/artifacts/impl-log.md` |
| review | `/review`, `/approve` | `.atelier/artifacts/review.md` |
| ship | `/ship` | release checklist (project-defined) |
| learn | `/learn` | `.atelier/artifacts/decision-log.md` |

Use `atelier-kit phase <name>` to force phase when the agent does not auto-select a skill.

## Modes (.atelierrc)

- **quick:** smaller stacks; may skip some planning gates (team choice).
- **standard:** full Questions → … → Review.
- **deep:** strict iteration on design; all gates on returns.

## Session state

Authoritative state lives in `.atelier/context.md` (YAML frontmatter + optional notes).  
CLI: `atelier-kit status`, `atelier-kit return`, `atelier-kit handoff`.

## Ship checklist (suggested)

- [ ] Tests relevant to the change pass.
- [ ] Observability touched if behavior crosses service boundaries.
- [ ] Feature flags / rollout steps documented if applicable.

## CLI reference

See `npx atelier-kit --help`.
