# Changelog

All notable changes to `@atelier-kit/atelier-kit` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses semver pre-1.0 — minor bumps may introduce breaking changes.

## [0.4.0] — 2026-06-03

A reposition from a planning CLI to a **skill-first behavior kit**. The agent's
work now lives in one Markdown file per task; the CLI shrinks to the only thing
code does better than prose — checking and reviewing the plan contract. Skills are
distributed via the open Agent Skills standard (`npx skills`) instead of a
per-host adapter layer.

### Breaking changes

- **Removed the state machine.** No more `.atelier/atelier.json`, `active.json`,
  `.atelier/epics/<slug>/state.json`, phases, tasks, or status ledger.
- **One artifact per task:** `.atelier/work/<slug>.md` (objective, questions,
  research, plan, implementation, validation, decisions, review). The multi-file
  epic tree (`questions.md`, `research/*`, `synthesis.md`, `design.md`,
  `decisions.md`, `plan.md`, `review.md`) is gone.
- **CLI reduced to `new`, `validate`, `review`.** Removed `init`, `status`,
  `off`, `export-plan`, and `install-adapter`. `validate`/`review` now read the
  slice contract from the work file's `## Plan` and are **mode-scaled** (quick is
  advisory; standard/deep enforce; deep also requires `## Risks`).
- **Removed the adapter layer** (`src/adapters/**`, `kit/rules/adapters/**`,
  `ADAPTERS.md`). Skills install via `npx skills add atelier-kit/atelier-kit`;
  `AGENTS.md` carries passive activation context.
- **Skills are now folder-based `SKILL.md` packages** under `skills/` (was
  `kit/skills/*.md`). Still three: `researcher` (now with the four question
  buckets), `designer`, `planner`.
- Dropped the `prompts` dependency; removed `kit/` and the JSON schemas.

### Added

- `templates/{work,decision}.md` and worked `examples/` (quick, standard, deep,
  research-only).

## [0.3.0] — 2026-05-23

A seven-phase refactor that sharpens the framework around its four pillars
(planning ≠ implementation, plan as verifiable contract, state in the repo,
opt-in). The CLI surface shrinks, two activation paths collapse to one, and
`review` / `validate --gate plan-ready` become real verification tools instead
of prose checklists. See `dev/refactor-plan.md` for the design rationale.

### Breaking changes

- **CLI surface trimmed from 13 commands to 8.** Removed: `next`, `done`,
  `doctor`, `render-rules`, `host-plan start`, `host-plan finalize`,
  `native-plan claude-*-hook`, alias `adapter install <name>`. Their
  responsibilities collapse into `install-adapter [--stdout]`,
  `validate [--verbose]`, and direct `state.json` updates by the active agent.
- **Skills collapsed from 8 to 3.** `researcher` (route-aware: questions /
  repo / tech / business sub-modes), `designer`, `planner` (covers plan mode
  and review mode). The `SkillName` Zod enum and `state.active_skill` now
  accept only those three values plus `null`. Repos that pinned the old
  skill names in custom code or rules need to remap.
- **No more `host-plan` / `native-plan` activation path.** Atelier never
  intercepts the host's `/plan` mode anymore; activation is exclusively
  `/atelier quick|plan|deep …` (or `atelier new …` in the CLI).
- **`atelier review` is now executable.** It enforces the slice contract:
  runs each `slice.validation` entry via `sh -c` (5-minute default timeout),
  diffs changed files against `allowed_files`, and exits non-zero on any
  drift or validation failure. The previous prose-only checklist is gone.
  Drift detection automatically ignores changes inside `.atelier/`.
- **`atelier validate --gate plan-ready` rejects weak plans.** New errors:
  empty `allowed_files`, catch-all patterns (`**`, `*`, `src/**`,
  `lib/**`, etc.), deep mode with placeholder-only `## Risks`. New warnings:
  vague acceptance criteria (`works`, `is correct`, < 8 words), validation
  steps with no recognizable shell runner. `validatePlanReady` now returns
  `{ errors, warnings }`; warnings do not fail the gate.
- **`kit/protocol/*.yaml` removed.** `gates.yaml`, `modes.yaml`,
  `skills.yaml`, `workflow.yaml` were decorative and never consumed at
  runtime. The Zod schemas in `src/protocol/schema.ts` remain the single
  source of truth.

### Added

- `MANIFESTO.md` (145 lines) replaces the 694-line manifesto with the four
  pillars and a single Mermaid cycle diagram.
- `src/adapters/registry.ts` — data-driven adapter table. Adding a host is
  now one entry, not a new TypeScript module.
- `src/adapters/install.ts` — single renderer consumed by both the CLI and
  `validate --verbose` installation checks.
- `src/review/` — executable review pipeline: `git-diff.ts`, `glob.ts`
  (allowed_files matcher), `slice-check.ts`, `validation-runner.ts`,
  `report.ts`. Total ~320 lines.
- `kit/skills/researcher.md` (~200 lines) — single discovery skill with
  four sub-modes routed by the active task type in `state.json`.
- `test/review.test.ts` (PASS / drift / validation-fail scenarios) and
  `test/plan-ready.test.ts` (heuristic coverage).
- `CHANGELOG.md` (this file) and a Repo-local dev infra section in
  `CONTRIBUTING.md`.

### Removed

- 5 commands: `src/commands/{doctor,host-plan,host-plan-nudge,native-plan,rules}.ts`
- 10 adapter modules: `src/adapters/{claude,cursor,codex,gemini-cli,antigravity,kiro,kilo,windsurf,cline,generic}.ts`
- 5 skill markdowns: `kit/skills/{questioner,repo-analyst,tech-analyst,business-analyst,reviewer,host-plan-coach}.md`
- 4 protocol YAMLs: `kit/protocol/{gates,modes,skills,workflow}.yaml`
- 2 docs: `AGENT-USAGE.md`, `kit/METHOD.md`, plus the old
  `atelier-kit-manifesto.md` (replaced by `MANIFESTO.md`)
- Dead exports in `src/protocol/templates.ts` (`workflowYaml`, `modesYaml`,
  `gatesYaml`, `skillsYaml`, `schemaJson`, `schemaFile`, `schemaFiles`,
  `coreRule`, `adapterRule`, `planTemplate`, `STANDARD_ADAPTERS`,
  `SKILLS`, plus the per-skill `skillBody` table). File shrank from ~1020
  lines to 191.
- `codex/` directory (leftover dev-infra test workspace; not an example).
- Tests for removed surface: `test/{host-plan,native-plan,doctor}.test.ts`.

### Changed

- `atelier validate` gained `--verbose` (folds in the old `doctor`'s
  installation-file checks).
- `atelier install-adapter` gained `--stdout` (replaces `render-rules`).
- `cmdValidate` prints a third "OK with warnings" state in yellow when only
  warnings are present.
- `src/commands/review.ts` is now a thin orchestrator (~75 lines) over the
  `src/review/` modules.
- `src/protocol/validator.ts` reads the installed-adapter file list from
  the new adapter registry instead of a duplicated table.
- `src/commands/lifecycle.ts` is now 9 lines (only `cmdOff`).
- Documentation surface: 3 docs collapsed (`README.md`, `MANIFESTO.md`,
  `PROTOCOL.md`, `ARCHITECTURE.md`, `ADAPTERS.md`, `CONTRIBUTING.md`,
  `CHANGELOG.md`, `CREDITS.md`). Each concept lives in exactly one
  canonical place; the others link to it.

### Migration notes

- Replace any scripted calls to removed commands:
  - `atelier next` / `atelier done` → the agent now edits
    `state.json.status` and `state.json.tasks[].status` directly.
  - `atelier render-rules --adapter X` → `atelier install-adapter X
    --stdout` (print) or `atelier install-adapter X` (write).
  - `atelier doctor` → `atelier validate --verbose`.
  - `atelier host-plan start|finalize`, any `native-plan` hook → no
    replacement. Activate Atelier explicitly with `/atelier …` or
    `atelier new`.
- Update any `.atelier/epics/*/state.json` files where `active_skill` is
  one of the removed names: `questioner|repo-analyst|tech-analyst|business-analyst`
  → `researcher`; `reviewer` → `planner`.
- Tighten any plan with `allowed_files: ["src/**"]` (or similar) before
  rerunning `atelier validate --gate plan-ready` — broad patterns now fail
  the gate. Use `src/<feature>/**` or specific file paths.

## [0.2.0]

Initial public preview. See git history for details.
