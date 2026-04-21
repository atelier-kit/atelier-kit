# atelier-kit framework architecture and phase flow

This document explains, in detail, how the framework is implemented today, how it is intended to operate, and what the difference is between:

- **execution implemented directly in code**, and
- **methodological execution expected between phases**.

That distinction is the key to understanding the project correctly.

## 1. What this project is

`atelier-kit` is a **TypeScript CLI** that installs and maintains a phase-oriented workflow inside a repository.

It is **not**:

- a background job orchestrator,
- an automatic state machine,
- a web framework,
- or a system that advances phases on its own.

Its core responsibility is to:

1. create a `.atelier/` workspace with method docs, skills, templates, and gates,
2. persist session state, especially the current phase,
3. adapt the method to different agent environments,
4. validate whether produced artifacts roughly match the expected shape for each phase.

The main implementation areas are:

- `src/cli.ts` - CLI entrypoint
- `src/commands/*` - CLI command handlers
- `src/state/*` - state persistence and parsing
- `src/adapters/*` - agent-environment integrations
- `src/gates/*` - validators for artifacts and skills
- `src/skill-loader.ts` - skill parsing and phase-to-skill mapping
- `kit/*` - static content copied into `.atelier/`

## 2. The framework mental model

The right way to think about this project is:

> **a phase-aware coordination framework for AI-assisted work, built around artifacts and context restriction**

It is made of four cooperating building blocks.

### 2.1 The kit

The `kit/` directory contains the reusable method content:

- `kit/METHOD.md` - the operating method
- `kit/skills/*/SKILL.md` - phase-specific instructions
- `kit/templates/*.md` - starter artifacts
- `kit/gates/*.md` - human-readable gate descriptions

During `init`, this content is copied into `.atelier/` inside the target repository.

### 2.2 Persistent state

Workflow state lives in two places:

- `.atelierrc` - global configuration for adapter and mode
- `.atelier/context.md` - authoritative session state

The most important point is:

**the current phase is stored in a file, not in a long-lived in-memory engine**

In practice, "execution" between phases is mostly a combination of:

- rewriting state files,
- reading previous artifacts,
- regenerating adapter instructions when needed.

### 2.3 Adapters

Adapters translate the `.atelier/` method into the conventions of each agent environment:

- Claude Code -> `.claude/skills/` + `CLAUDE.md`
- Cursor -> `.cursor/skills/` + `.cursor/rules/atelier-core.mdc`
- Codex CLI -> `AGENTS.md`
- Windsurf -> `.windsurfrules`
- Generic -> `atelier-system-prompt.txt`

They do not change the workflow logic itself. They change **how the agent receives and consumes that logic**.

### 2.4 Gates

Gates are heuristic validators. They inspect artifacts and check whether:

- the shape looks correct,
- the structure follows the method,
- obvious signs of inconsistency are present or absent.

Important:

**gates do not execute phases, do not advance phases, and do not control an automatic pipeline**

They only report whether the produced output **looks consistent** with the expected contract.

## 3. Runtime architecture

### 3.1 CLI entrypoint

The file `src/cli.ts` registers these commands:

- `init`
- `phase <name>`
- `status`
- `return <phase> --reason`
- `mode <quick|standard|deep>`
- `handoff`
- `doctor`
- `validate <phase>`
- `install-adapter <name>`

The CLI uses **Commander** and is built with **tsup** into `dist/cli.js`.

### 3.2 Bundled kit resolution

In `src/paths.ts`, `getKitRoot()` resolves the `kit/` directory next to the compiled build, unless `ATELIER_KIT_ROOT` is overridden for tests.

That means the published package has two kinds of content:

- executable code in `dist/`
- static method content in `kit/`

This separation is a strength because the method can evolve with limited coupling to the CLI runtime.

## 4. Installation lifecycle

The main adoption entrypoint is `atelier-kit init`.

### 4.1 What `init` does

`src/commands/init.ts` runs the following sequence:

1. chooses the `adapter` and `mode`, either from prompts or defaults,
2. creates `.atelier/` and `.atelier/artifacts/`,
3. copies the full `kit/` tree into `.atelier/`,
4. writes `.atelier/brief.md`,
5. writes starter artifacts under `.atelier/artifacts/`,
6. writes `.atelierrc`,
7. writes `.atelier/context.md` with initial phase `brief`,
8. installs the selected adapter into the repository root.

### 4.2 Result of `init`

After `init`, the repository contains:

- `.atelier/METHOD.md`
- `.atelier/skills/...`
- `.atelier/templates/...`
- `.atelier/gates/...`
- `.atelier/brief.md`
- `.atelier/artifacts/*.md`
- `.atelier/context.md`
- `.atelierrc`
- adapter output files such as `AGENTS.md`, `.windsurfrules`, `CLAUDE.md`, `.cursor/rules/atelier-core.mdc`, or `atelier-system-prompt.txt`

So `init` does not "start a system". It **materializes a methodological workspace** inside the repository.

## 5. State model

### 5.1 `.atelierrc`

`.atelierrc` stores more stable configuration:

- `version`
- `adapter`
- `mode`

This file is managed by `src/state/atelierrc.ts`.

### 5.2 `.atelier/context.md`

This is the most important file in the framework.

`src/state/context.ts` reads and writes it, and `src/state/schema.ts` defines its structure with Zod.

The frontmatter accepts:

- `atelier_context_version`
- `phase`
- `mode`
- `adapter`
- `gate_pending`
- `updated_at`
- `returns`

The body may contain freeform notes.

### Practical implication

When the phase changes, the system does **not** update a long-lived runtime structure.

It simply:

1. reads `context.md`,
2. changes the `phase` field,
3. rewrites the file,
4. optionally regenerates the adapter output.

So phase transitions are document persistence, not automatic orchestration.

### Important nuance about duplicated state

Although `.atelierrc` is the main home for `adapter` and `mode`, the `context.md` schema also allows those fields.

In practice:

- `init` writes `mode` and `adapter` into both files,
- `mode` updates only `.atelierrc`,
- `install-adapter` updates only `.atelierrc`,
- `phase` and `return` preserve whatever is already in `context.md`, but do not reconcile those fields with `.atelierrc`.

That means there is a **potential duplication of information** between the two files.

Today this does not break the main workflow because:

- `phase` is the truly authoritative input for skill selection,
- `status` reads `.atelierrc` for displayed `adapter` and `mode`,
- `refreshFallbackAdapters()` also reads `.atelierrc`.

Still, architecturally, `mode` and `adapter` in `context.md` behave more like an initial mirror than a fully synchronized source of truth.

### 5.3 Return history

The `return` command does more than change the phase.

It also appends an entry into `returns[]` with:

- `from`
- `to`
- `reason`
- `at`

That creates a small but useful audit trail of backward movement in the workflow.

## 6. Canonical framework phases

The valid phases are defined in `src/state/schema.ts`:

- `brief`
- `questions`
- `research`
- `design`
- `outline`
- `plan`
- `implement`
- `review`
- `ship`
- `learn`

These phases match the method described in `kit/METHOD.md`.

### 6.1 High-level intended flow

The method intends work to move like this:

1. capture the problem,
2. raise neutral questions,
3. research the answers,
4. design the target state,
5. turn that into structure and slices,
6. convert it into an executable plan,
7. implement slice by slice,
8. review against the plan,
9. prepare ship with human approval,
10. record durable lessons and decisions.

### 6.2 Phase-to-skill mapping

`src/skill-loader.ts` maps runtime phases to skills:

- `questions` -> `questions`
- `research` -> `researcher`
- `design` -> `designer`
- `outline` -> `designer`
- `plan` -> `planner`
- `implement` -> `implementer`
- `review` -> `reviewer`
- `learn` -> `chronicler`

There is no dedicated skill for:

- `brief`
- `ship`

In those cases, the system relies more heavily on `METHOD.md` and human process.

### 6.3 Expected artifacts by phase

| Phase | Main input | Main output |
| --- | --- | --- |
| `brief` | human problem definition | `.atelier/brief.md` |
| `questions` | `brief.md` | `.atelier/artifacts/questions.md` |
| `research` | `questions.md` | `.atelier/artifacts/research.md` |
| `design` | `brief.md`, `research.md` | `.atelier/artifacts/design.md` |
| `outline` | `brief.md`, `research.md`, `design.md` | `.atelier/artifacts/outline.md` |
| `plan` | `design.md`, `outline.md` | `.atelier/artifacts/plan.md` |
| `implement` | `outline.md`, `plan.md` | source code + `.atelier/artifacts/impl-log.md` |
| `review` | `outline.md`, `plan.md`, `impl-log.md` | `.atelier/artifacts/review.md` |
| `ship` | review result + project-specific release checks | no strongly enforced file |
| `learn` | context + artifacts | `.atelier/artifacts/decision-log.md` |

## 7. How execution between phases actually works

This is the central implementation point.

The framework does **not** implement a full state machine with:

- mandatory transition rules,
- hard prerequisites,
- persisted approval states,
- automatic phase advancement,
- chained phase jobs.

Instead, execution between phases works as a file-driven handoff chain.

### 7.1 Step 1: a phase is selected

A phase changes when:

- the user runs `atelier-kit phase <name>`,
- the user runs `atelier-kit return <phase> --reason ...`,
- an agent follows the method convention and the human updates state explicitly.

### 7.2 Step 2: state is persisted

In `src/commands/phase.ts`, the phase is validated against the enum and then passed to `setPhase()`, which rewrites `.atelier/context.md`.

In `src/commands/return-cmd.ts`, the same file is rewritten with updated return history.

### 7.3 Step 3: some adapters are regenerated

After a phase change, `refreshFallbackAdapters()` reinstalls only:

- `generic`
- `windsurf`
- `codex`

That happens because those adapters depend directly on the current phase being materialized in generated output.

Cursor and Claude work differently: they install stable instructions that tell the agent to **read `context.md` every time**.

### 7.4 Step 4: the agent discovers the next execution context

The agent or next session is expected to:

1. read `.atelier/context.md`,
2. identify the current phase,
3. load the corresponding skill,
4. read only the artifacts allowed by that skill,
5. produce the expected artifact for that phase.

That is the core of the "skills-first" design.

### 7.5 Step 5: the produced artifact becomes the next phase input

The real chaining between phases is not implemented through internal jobs. It is implemented through **documents**.

Examples:

- `questions.md` feeds `research`
- `research.md` feeds `design`
- `design.md` and `outline.md` feed `plan`
- `plan.md` feeds `implement`
- `impl-log.md` feeds `review`

In other words, the real workflow engine today is:

> **the `phase` field + artifacts + adapters that expose the correct skill**

There is no hidden engine beyond that.

## 8. How the framework was planned to work between phases

From `METHOD.md` and the `SKILL.md` files, the design intent is very clear.

### 8.1 Questions

The `questions` phase is designed to:

- read the `brief`,
- turn the goal into verifiable questions,
- classify each question as `[repo]`, `[tech]`, or `[market]`,
- avoid premature answers, design, or recommendations.

The idea is to separate:

- **intent capture**, and
- **fact gathering**

### 8.2 Research

The `research` phase is intentionally isolated from the `brief`.

The researcher reads `questions.md` and should **not** read the original goal document. That is an important methodological choice: reduce premature implementation bias.

Inside `research`, there are three internal stages:

1. `[repo]` - repository mapping
2. `[tech]` - external technical research
3. `[market]` - market or UX benchmark

Those stages are **not** separate runtime phases. They are internal sub-stages of one phase.

### 8.3 Design -> Outline -> Plan

This sequence is the main planned execution idea in the framework.

#### Design

`design.md` answers the "why" and the "what":

- current state,
- desired state,
- patterns to follow,
- patterns to avoid,
- open decisions.

#### Outline

`outline.md` answers "what shape should the solution have":

- boundaries,
- components,
- interfaces,
- contracts,
- slices,
- build order.

#### Plan

`plan.md` answers "how should this be executed":

- tasks per slice,
- implementation order,
- dependencies,
- tests,
- small executable work units.

The planned model, in one line, is:

> **design defines direction -> outline defines structure -> plan defines executable order**

### 8.4 Implement

Implementation is designed around **vertical slices**.

That means the intended process is not:

- first change all persistence,
- then all API code,
- then all UI code.

Instead, the intended process is:

- choose the first slice,
- cut across all required layers,
- validate that slice,
- record deviations,
- only then move to the next slice.

That reduces the risk of opening too many fronts without intermediate validation.

### 8.5 Review

The `review` phase is designed as a role separate from implementation.

The reviewer should compare:

- produced code,
- `outline.md`,
- `plan.md`,
- `impl-log.md`

Review should not re-implement. It should identify divergence, risk, and missing work.

### 8.6 Ship and Learn

`ship` is more of an operational checkpoint than a deeply implemented phase.

`learn` exists to record durable decisions and lessons in `decision-log.md`, using:

- return history,
- impl-log,
- review,
- and the rest of the session artifacts.

## 9. Role of adapters in the workflow

Each adapter expresses the same method in a different delivery style.

### 9.1 Cursor and Claude

These adapters install relatively stable instructions and vendor the skills into the environment.

They rely on this contract:

1. the agent should always read `.atelier/context.md`,
2. the `phase` field is the source of truth,
3. the active skill should be chosen from that phase.

That is why they do not need regeneration on every phase change.

### 9.2 Generic, Codex, and Windsurf

These adapters are more dependent on the materialized current phase.

- `generic` generates one prompt file with the method and active skill embedded
- `codex` regenerates `AGENTS.md` to point at the active skill
- `windsurf` regenerates `.windsurfrules` with the current phase and an embedded skill snippet

That is why the code reinstalls those adapters after a phase change.

## 10. What the code validates today

The gates have different maturity levels.

### 10.1 `questions` gate

It checks:

- whether bullets have `[repo]`, `[tech]`, or `[market]`,
- whether content seems coherent with the selected scope,
- whether there are signs of prescriptive questions,
- whether the `brief` is leaking too directly into the questions.

This is a relatively strong early-stage gate.

### 10.2 `research` gate

It checks:

- whether each question has a matching answer block,
- whether `[repo]` answers contain code or path references,
- whether `[tech]` and `[market]` answers contain URLs,
- whether each answer appears under the correct stage.

This is also a relatively concrete gate.

### 10.3 `design` gate

It checks:

- whether `design.md` is not too short or too long,
- whether required sections exist.

It validates shape reasonably well, but only lightly validates semantics.

### 10.4 `plan` gate

Today it is weaker than the methodology suggests.

In practice, it:

- checks whether `outline.md` and `plan.md` exist,
- tolerates `_TBD_`,
- emits little to no real misalignment feedback between outline and plan.

So the methodological idea of a plan being a strict expansion of the outline is not yet strongly enforced in code.

### 10.5 `implement` gate

It checks:

- whether `plan.md` exists,
- whether `impl-log.md` exists,
- whether slices named in the plan appear in the log.

It reinforces logging discipline, but does not deeply validate implementation against the plan.

### 10.6 `doctor`

`doctor` aggregates:

- instruction budget
- skill shape
- questions
- research
- design
- plan
- implement

So it acts as a general structural health check for the workflow kit.

## 11. Technical evaluation of the current implementation

Overall, the implementation is good as a conceptual structure and operational kit, but it is still closer to a **workflow coordination framework** than to a **workflow engine**.

### 11.1 Strengths

#### 1. Clean separation between method and runtime

The method lives in `kit/`, while the CLI runtime lives in `src/`.

That keeps maintenance simpler and reduces coupling.

#### 2. Simple, inspectable state

Using `.atelier/context.md` and `.atelierrc` is a strong choice because the state is:

- easy to version,
- easy to debug,
- portable,
- readable by both humans and agents.

#### 3. Explicit handoff between phases

Intermediate artifacts make session reasoning concrete.

That is much better than depending only on ephemeral conversational context.

#### 4. Good portability across environments

The adapter layer allows the same method to run across Cursor, Claude, Codex, Windsurf, and a generic mode.

#### 5. Strong research-isolation idea

Preventing the researcher from reading `brief.md` is a strong methodological choice. It helps reduce confirmation bias too early in the process.

### 11.2 Important limitations

#### 1. Phase progression is manual

Any valid phase can be set directly.

There is no:

- transition graph,
- prerequisite enforcement,
- mandatory gate-before-advance rule,
- or approval automation.

#### 2. Modes are more descriptive than executable

`quick`, `standard`, and `deep` are persisted and documented, but they barely change runtime behavior today.

Right now, they represent more of an **operating intent** than strongly encoded logic.

#### 3. `gate_pending` is informational only

The field exists in the schema, appears in `status`, and is surfaced by the generic adapter, but no command actively governs it.

#### 4. The framework depends heavily on agent compliance

Many system guarantees depend on the agent actually:

- reading `context.md`,
- choosing the correct skill,
- respecting `reads` and `produces`,
- avoiding conceptual phase skipping.

#### 5. Later-stage validation is still shallow

The beginning of the workflow is reasonably well guarded.

But `outline`, `plan`, `ship`, and the strong planning-to-execution relationship are not yet equally materialized in code.

### 11.3 Concrete implementation gaps

#### A. `outline` has no dedicated validator

Today `validate outline` is routed through the same gate as `design`.

In practice, that means the project still does not validate `outline.md` as its own structural artifact.

#### B. The `plan` gate is below the ambition of the method

By the method, `plan` should be a disciplined expansion of `outline`.

In the current code, that relationship is barely enforced.

#### C. There are no formal persisted approvals

References such as `/approve-design`, `/approve-outline`, and `/approve` appear as workflow conventions, not as strong system state.

#### D. `ship` exists more in the method than in the runtime

The phase exists in the enum and the method, but it has no:

- required artifact,
- dedicated gate,
- dedicated operational command.

## 12. Practical interpretation: what this framework is trying to be

From the current implementation, the project appears intended to be a lightweight operating system for coding-agent sessions, with these properties:

1. the human records the goal in `brief.md`,
2. the agent formulates verifiable questions,
3. research answers those questions without jumping to a solution,
4. planning happens in layers before coding starts,
5. implementation happens in vertical slices,
6. review is separate from implementation,
7. the whole method can be carried across different agent environments.

So the project is closer to:

> **a collaboration contract between human and agent, based on phases and artifacts**

than to:

> **an automatic system that executes phases on its own**

## 13. Final distinction: two meanings of execution

To avoid misreading the framework, it helps to separate two notions.

### 13.1 Execution directly implemented by the code

The code directly performs these actions:

- creates files,
- copies the kit,
- persists state,
- changes phase,
- rewrites adapters,
- validates artifacts,
- prints status and handoff output.

### 13.2 Execution expected by the method

The method expects the human-agent process to:

- move through disciplined phases,
- restrict context by skill,
- preserve evidence from one phase to the next,
- insert human approval checkpoints,
- prevent implementation from bypassing the planning layers.

### 13.3 Central conclusion

The code implements the **infrastructure of the method** well.

But the **strong orchestration of the method** is still mostly social and documentary, not programmatic.

In short:

> today, the framework behaves like a **workflow scaffold with persisted state, skills, and gates**

and it was clearly designed to support a process in which:

> **each phase produces a verifiable artifact that becomes disciplined input for the next phase**

That is the core idea of phase execution here.
