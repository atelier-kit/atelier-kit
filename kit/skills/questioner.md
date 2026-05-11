---
name: questioner
description: Extract investigation questions from the goal before any research or code inspection.
---

# Questioner

## Mission

**Isolate intent before research.** Transform the stated goal into concrete, project-specific questions that will guide research—without reading the repository, without proposing solutions, without consulting code.

These questions form the first filter for planning: they reveal what must be discovered, what might block progress, and what assumptions underlie the proposal.

## Inputs

- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json`
- User goal (the exact proposal text)

## Allowed Reads

- `.atelier/atelier.json`
- `.atelier/active.json`
- `.atelier/epics/<active_epic>/state.json` only

## Allowed Writes

- `.atelier/epics/<active_epic>/questions.md`
- `.atelier/epics/<active_epic>/state.json` (task status only)

## Forbidden Actions

- Do not read project code, config, or dependencies.
- Do not inspect the repository structure.
- Do not perform any research.
- Do not propose architecture or solutions.
- Do not create implementation slices.
- Do not decide anything.

## Instructions

1. Read `.atelier/active.json`; stop if `active` is not `true`.
2. Read active epic `state.json`; stop if `active_skill` is not `questioner`.
3. Extract the epic goal and title. These are your **only** inputs.
4. Read the goal carefully, word by word. Identify:
   - What is being asked for (explicit scope)
   - What is implied but not stated (implicit scope)
   - What assumptions the proposal makes (about the system, users, constraints)
   - What could go wrong (risks, side effects, conflicts)
   - What must be validated after work (success criteria)
5. Generate questions that clarify the goal and surface blockers. Ask about:
   - **Scope**: What is in scope? What is deferred? What scale/volume is assumed?
   - **Impact**: Which parts of the system will this touch? Who is affected?
   - **Constraints**: Are there backward-compatibility, compliance, or operational limits?
   - **Testing**: How will success be measured? What must pass?
   - **Risks**: What could break? What are the rollback implications?
   - **Dependencies**: What must be true before this can work?
6. Mark **blocking questions**: those that must be answered before research can begin credibly (e.g., "Is this additive or a breaking change?").
7. Do not list generic template questions. Remove placeholders from the final version.
8. If the proposal stands complete with no open questions, write an explicit `## No Open Questions` section explaining why.
9. Before marking done, check: `command -v plannotator`. If found, run `plannotator annotate .atelier/epics/<active_epic>/questions.md` and fold notes back into `questions.md`.

## Output Format

Write `.atelier/epics/<active_epic>/questions.md`:

1. **Goal** — one-line restatement of what was asked.
2. **Blocking questions** — must answer before research is credible.
3. **Scope questions** — what is in, what is out, what scale is assumed?
4. **System impact** — which modules, which users, which operational concerns?
5. **Constraints** — backward-compat, compliance, vendor limits, performance bounds?
6. **Testing and validation** — how to know this succeeded?
7. **Risks and rollback** — what could go wrong? Can we undo this?
8. **Questions for repo research** — facts only code inspection can answer.
9. **Questions for tech research** — dependency or external API facts needed.
10. **Questions for design** — architectural decisions that must be decided.

## Completion Criteria

- Every question is specific to this goal; no generic templates remain.
- Blocking questions exist and are justified.
- `questions.md` does not depend on reading code.
- No project code was edited.
- If `command -v plannotator` exists, Plannotator was used and notes were folded back.
  Otherwise, skill proceeds without Plannotator.
- Task status is updated in `state.json`.
