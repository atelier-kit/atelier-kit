# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@atelier-kit/atelier-kit` — a small Node 20+ CLI (`atelier` / `atelier-kit`) plus a bundled `kit/` payload that installs a `.atelier/` planning protocol into any repo. The CLI itself does not plan anything; it scaffolds files, validates state and gates, renders host-agent adapter rules, and exports native plan mirrors. The "thinking" is done by the host agent following the skills/rules the CLI installs.

## Commands

Package manager: **pnpm 9** (declared in `package.json`). Use `pnpm` rather than `npm` for installs to honor the lockfile.

```bash
pnpm install                # install deps
pnpm run build              # tsup → dist/cli.js (ESM, node20 target)
pnpm run dev                # tsup --watch
pnpm test                   # vitest run (single shot, used by CI)
pnpm run test:watch         # vitest watch mode
pnpm run lint               # tsc --noEmit  (this repo's "lint" is type-check)
```

Run a single test file or pattern:

```bash
pnpm exec vitest run test/init.test.ts
pnpm exec vitest run -t "creates .atelier"
```

Run the built CLI locally (after `pnpm run build`):

```bash
node dist/cli.js <command>             # e.g. node dist/cli.js status
```

CI (`.github/workflows/ci.yml`) runs `lint`, `build`, `test`, and `npm pack --dry-run` on Node 20 and 22 — keep all four green.

## Architecture

The codebase has two halves that must stay in sync:

### 1. The CLI (`src/`)

- `src/cli.ts` — commander entry; every subcommand is one file under `src/commands/` (`init`, `new`, `status`, `validate`, `export-plan`, `review`, `lifecycle` (just `cmdOff`), `install-adapter`).
- `src/protocol/` — the V2 protocol layer. `schema.ts` defines the Zod schemas (`AtelierConfigSchema`, `ActiveStateSchema`, `EpicStateSchema`, …); `state.ts` is the I/O boundary that reads/writes the three authoritative JSON files; `paths.ts` resolves `.atelier/` locations; `init.ts` copies the bundled kit and writes the inactive defaults; `validator.ts` powers `atelier validate` (incl. `--gate plan-ready`); `templates.ts` produces default config/state objects.
- `src/adapters/` — one file per host (`claude.ts`, `cursor.ts`, `codex.ts`, `gemini-cli.ts`, `antigravity.ts`, `kiro.ts`, `kilo.ts`, `windsurf.ts`, `cline.ts`, `generic.ts`) plus `index.ts` dispatcher. Adapters are thin localizers that decide where rules/commands/skills land for each host. The matrix in `ADAPTERS.md` must match what these files write.
- `src/gates/` — protocol invariants (`instruction-budget.ts`, `skill-shape.ts`) used by `doctor`/`validate`.
- `src/skill-loader.ts` — parses skill markdown frontmatter (gray-matter + Zod).
- `src/paths.ts` — locates the bundled `kit/` next to `dist/cli.js`; honors `ATELIER_KIT_ROOT` env var, which is how tests point the runtime at the source `kit/` tree.

### 2. The bundled payload (`kit/`)

Shipped verbatim into a consumer's `.atelier/` by `atelier init` (see `src/protocol/init.ts` → `copyBundledKit`). Contains the protocol the agent reads, not TypeScript:

- `kit/protocol/` — `workflow.yaml`, `modes.yaml`, `skills.yaml`, `gates.yaml`
- `kit/rules/core.md` + `kit/rules/adapters/<adapter>.md` — host-agnostic + host-specific instructions
- `kit/skills/*.md` — three narrow playbooks (`researcher`, `designer`, `planner`) loaded one at a time per `active_skill`. `researcher` is route-aware (sub-modes: questions / repo / tech / business based on the active task type). `planner` covers both plan mode and review mode.
- `kit/schemas/*.schema.json` — JSON Schemas matching the Zod schemas in `src/protocol/schema.ts`

**When you change `src/protocol/schema.ts`, update the matching `kit/schemas/*.schema.json` (and vice-versa) — both are part of the public protocol contract.** The schemas under `kit/` are what end users' tools see; the Zod schemas are what the CLI enforces. `test/init.test.ts` and `test/protocol-v2.test.ts` will catch drift in the file set but not in field-level shape.

### Source of truth (runtime, not this repo)

Inside a consumer repo with Atelier installed, only three files are authoritative:

```
.atelier/atelier.json                       # config (adapter, default mode)
.atelier/active.json                        # global activation flag
.atelier/epics/<epic-slug>/state.json       # per-epic ledger
```

Nothing else in `.atelier/` is operational state. This invariant is checked by `atelier validate` (use `--verbose` for installation checks) — keep it true when adding features.

### Activation model

Atelier ships **inactive**. `active.json` starts `{ active: false, mode: "native", active_epic: null }`. The CLI must not assume Atelier is on; commands like `status`/`validate` short-circuit when inactive. New commands and adapter rules must preserve this: outside an explicit `/atelier …` activation, the host agent behaves exactly as it did without Atelier. Atelier never intercepts the host's `/plan ...` mode.

## Tests

- Vitest, Node env, ESM, files in `test/**/*.test.ts` (see `vitest.config.ts`).
- Tests run against the source `kit/` tree by setting `process.env.ATELIER_KIT_ROOT = kitPath()` (see `test/helpers.ts`). When adding tests that exercise `cmdInit` / `initializeProtocol`, set this env var and clean it up in `afterEach` — otherwise the test will look for `kit/` next to a non-existent `dist/`.
- Most tests scaffold a `mkdtemp()` workspace via `tempDir()` from `test/helpers.ts` and exercise commands against it. Follow that pattern instead of writing into the repo.

## Conventions

- TypeScript, ESM, strict mode, NodeNext resolution. Imports use the `.js` extension even from `.ts` files (NodeNext requirement) — see `src/cli.ts` for the pattern.
- No runtime dependencies beyond `commander`, `gray-matter`, `picocolors`, `prompts`, `zod`. Keep the install small; prefer adding logic over dependencies.
- Small modules with explicit file I/O boundaries (per `CONTRIBUTING.md`). All JSON reads/writes go through `src/protocol/state.ts` so Zod validation happens at the boundary.
- Contributions must be clean-room original work (see `CONTRIBUTING.md`); do not paste prompts or large passages from other agent-tooling projects.

## Reference docs (read before changing protocol behavior)

- `MANIFESTO.md` — the four pillars (planning ≠ implementation, verifiable contract, repo state, opt-in)
- `PROTOCOL.md` — state machine, gates, source-of-truth files
- `ARCHITECTURE.md` — layer breakdown, state transitions, validation rules
- `ADAPTERS.md` — adapter matrix (which files each host expects)
- `dev/refactor-plan.md` — record of the 7-phase refactor that produced the current shape; consult for the design rationale
