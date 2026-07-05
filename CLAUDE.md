# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Atelier-Kit is a planning protocol for **structured, opt-in agent planning**. It provides:
- A small CLI (`atelier` command) to initialize and manage planning state
- A `.atelier/` directory structure with artifacts, rules, schemas, and skills
- Integration adapters for Claude Code, Cursor, Codex, and other agent platforms
- Optional hooks into host-agent plan modes to enable Atelier workflows within native planning interfaces

**Key principle**: Atelier is **inactive by default**. Nothing happens until someone activates it with `/atelier ...`, an equivalent cue, or through native-plan hooks.

**Runtime is 100% file-based / CLI-free.** The agent bootstraps epics (via `.atelier/skills/bootstrap.md`), runs gate self-checks, and writes the review entirely by reading/writing files under `.atelier/`. The `atelier` CLI stays functional but is **optional** — it installs the files (`init`, `render-rules`, `install-adapter`) and can re-verify state deterministically (`validate`, `review`, `doctor`), but no skill or adapter rule instructs the agent to run it. The `test/adapters.test.ts` "never instructs the atelier CLI" test guards this: agent-facing text must not contain the `` `atelier <runtime-verb>` `` invocation form.

## Development Commands

```bash
# Install dependencies (Node >= 20, pnpm 9.15.0)
pnpm install

# Build the TypeScript CLI to dist/
pnpm run build

# Watch mode during development
pnpm run dev

# Run tests
pnpm test
pnpm test:watch

# Type check without building
pnpm run lint
```

The package is published as `@atelier-kit/atelier-kit` with binary aliases `atelier` and `atelier-kit`.

## Architecture

### High-Level Structure

The project consists of:

1. **CLI** (`src/cli.ts`) — Entry point for `atelier` commands; routes to command handlers
2. **Commands** (`src/commands/`) — Each command (init, new, validate, export-plan, review, etc.) is a module
3. **Protocol** (`src/protocol/`) — Core state management
   - `state.ts` — Epic state transitions and validation
   - `epic.ts` — Epic ledger management
   - `schema.ts` — Zod schemas for `.atelier.json`, `state.json`, etc.
   - `validator.ts` — Validation logic for planning gates
   - `templates.ts` — Default artifact templates
   - `init.ts` — Protocol initialization
4. **Adapters** (`src/adapters/`) — Host-specific rule renderers (Claude Code, Cursor, Codex, Windsurf, etc.)
5. **Gates** (`src/gates/`) — Planning validation gates (e.g., `plan-ready`, `instruction-budget`)

### Kit Directory

The `kit/` directory contains **templates and rule files** distributed with the CLI:

- `protocol/` — Protocol YAML files (default skill order, artifact shapes, etc.)
- `rules/` — Adapter rule templates for each host (Claude Code, Cursor, etc.)
- `schemas/` — JSON schemas for validation
- `skills/` — Skill markdown templates (bootstrap, questioner, researcher, designer, planner, reviewer; plus host-plan-coach). `bootstrap` is the file-based epic-creation skill used at activation.

### State Model

When active, Atelier manages state in three JSON files:

1. **`.atelier/atelier.json`** — Global config (adapter, mode defaults, etc.). Read once during init.
2. **`.atelier/active.json`** — Global activation state (is Atelier on? which epic is active?)
3. **`.atelier/epics/<epic-slug>/state.json`** — Per-epic state (current task, status, slices, violations). **This is the source of truth** for the active epic.

The active epic owns artifacts under `.atelier/epics/<epic>/` — ceremony scales with mode (quick=2, standard=3, deep=4 artifacts):
```
├── state.json
├── research.md   (standard/deep — ## Questions + evidence sections, consolidated, ~300-line budget)
├── design.md     (deep; optional in standard — decisions embedded as an ADR-style ## Decisions section)
├── plan.md       (living contract; quick mode keeps research inline under ## Research Notes)
└── review.md
```

### Skill System

Skills are narrow playbooks for one phase of planning. Each skill:
- Is a markdown file named after its phase (e.g., `questioner.md`, `planner.md`)
- Lives in `kit/skills/` (templates) and `.atelier/rules/skills/` (installed copies)
- Contains instructions and Zod schemas for that phase's artifacts
- Is loaded **only when active** (via `active_skill` in `state.json`)

Example flow (after `bootstrap` creates the ledger at activation):
```
questioner -> researcher -> [designer] -> planner -> reviewer
```

The questioner writes only the `## Questions` section of `research.md`; the researcher fills the remaining evidence sections of the same document. Legacy skill names (repo-analyst, tech-analyst, business-analyst) and task types (repo/tech/business/synthesis) remain valid in schemas so pre-consolidation ledgers still parse; legacy research tasks route to the researcher skill.

### Adapter Rendering

`atelier render-rules --adapter <name>` generates host-specific rule files from templates:

| Host | Output | Purpose |
|------|--------|---------|
| Claude Code | `CLAUDE.md` + `.claude/commands/atelier.md` + `.claude/skills/atelier/*.md` | Adapter rules, custom commands, skills |
| Cursor | `.cursor/rules/atelier-core.mdc` | Cursor-specific rules |
| Codex | `AGENTS.md` | Codex agent instructions |
| Windsurf | `.windsurfrules` | Windsurf rules |
| Cline | `.clinerules/atelier-core.md` | Cline-specific rules |

## Key Concepts

### Activation States

- **Inactive** (default): `active.json` has `"active": false`. Atelier is dormant; the agent works normally.
- **Active**: `/atelier quick ...`, `/atelier plan ...`, or `/atelier deep ...` create an epic and set `"active": true`. The `active_epic` field points to the ledger.

### Planning Modes

- **quick**: Starts directly at planning with the planner skill; research is inline in `plan.md` (`## Research Notes`). Artifacts: plan.md + review.md.
- **standard** (aka `plan`): questioner → researcher → planning. Artifacts: research.md + plan.md + review.md (design.md optional).
- **deep**: Adds a required `design.md` (with `## Risk register`, `## Rollback`, `## Test strategy` sections) and `## Product behavior` in research.md.

### Planning Gates

`atelier validate --gate research-ready` (standard/deep) enforces before the research task can be marked done: required sections per mode, no `_Pending._` leftovers, seed questions replaced; warns above the ~300-line budget.

`atelier validate --gate plan-ready` enforces these before `atelier done`:

1. Active epic exists
2. `plan.md` exists with:
   - goal, assumptions, risks sections
   - slices (vertical cuts with scope, **allowed files**, acceptance criteria, validation)
3. `state.json` reflects the same slice structure (each slice must have non-empty `allowed_files`)

`atelier review` additionally cross-checks changed files against the slices' `allowed_files` (Scope Check) and records out-of-scope files in `state.json.violations`.

The `planner` skill manages these checks; the validator enforces them.

### Native Plan Mirrors

When a plan is ready, `atelier export-plan --adapter claude-code` copies the canonical `.atelier/epics/<epic>/plan.md` to the agent's native location (e.g., `~/.claude/plans/<epic>.md`). This lets the host agent implement from its native plan UI. Mirrors are derived; the Atelier `plan.md` is canonical.

## Development Focus Areas

### Adding New Commands

1. Create a module in `src/commands/<name>.ts`
2. Export a function matching the `Command` interface (defined in `cli.ts`)
3. Register it in `cli.ts` with `.command(...)`

Commands interact with the protocol via imports from `src/protocol/`.

### Adding Validation Gates

1. Create a module in `src/gates/<name>.ts` that exports a validation function
2. Call it from `src/protocol/validator.ts` in the appropriate validation context
3. Document the gate requirements in PROTOCOL.md

### Adapter Maintenance

When you modify the protocol:
- Update adapter templates in `kit/rules/<adapter>/` (e.g., `kit/rules/claude/`)
- Run `atelier render-rules --adapter <name>` to regenerate output files
- Test that the generated rules integrate correctly with the host (e.g., Claude Code can parse the custom commands)

### Testing

Tests use Vitest. Key patterns:
- Validate state transitions (e.g., discovery → planning)
- Validate gate logic (e.g., `plan-ready` checks all slices have acceptance criteria)
- Validate schema parsing (e.g., malformed `state.json` is caught)

Run `pnpm test:watch` during development for instant feedback.

## Code Style

- **TypeScript** with strict mode enabled (`tsconfig.json`)
- **ESM** (ECMAScript modules; no CommonJS)
- **Explicit file I/O boundaries** — centralized in `src/paths.ts` and protocol modules
- **Small modules** — prefer focused, single-purpose files over large utilities
- **Zod for validation** — all protocol files are validated on read

## When Atelier Is Active

If you encounter a task within an active epic:

1. Check `.atelier/active.json` to confirm Atelier is on and which epic is active
2. Read `.atelier/epics/<active_epic>/state.json` to see the current status and required artifacts
3. Load **only** the skill named by `active_skill` — don't load all skills at once
4. Follow the skill's instructions for writing or updating that phase's artifact
5. When done, skills update `state.json` directly (or `atelier done` can be used as a helper)

The protocol doesn't replace the agent's reasoning — it just structures where outputs go and what gets validated before marking planning done.

## References

- **README.md** — User-facing overview and quickstart
- **PROTOCOL.md** — Detailed protocol specification (states, gates, CLI)
- **ARCHITECTURE.md** — Architecture diagrams and adapter matrix
- **AGENT-USAGE.md** — What agents should read when Atelier is active
- **CONTRIBUTING.md** — Contribution guidelines and development setup
