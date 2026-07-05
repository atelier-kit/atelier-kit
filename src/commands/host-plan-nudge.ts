import type { ActiveState, EpicState } from "../protocol/schema.js";
import { taskTypeToSkillFolder } from "../skill-loader.js";

const MAX_NUDGE = 9000;

export type HostPlanNudgeState = {
  active: ActiveState;
  state: EpicState | null;
};

/**
 * Injected on each Claude Code UserPromptSubmit in plan permission mode when
 * Atelier has an active V2 epic, so the host's plan UI follows the same artifact
 * pipeline (research -> design when scheduled -> plan) without a second
 * operational state file.
 */
export function formatHostPlanFrameworkNudge(input: HostPlanNudgeState | EpicState): string | null {
  const state = "state" in input ? input.state : input;
  if (!state) return null;
  if (state.status === "planned" || state.status === "review" || state.status === "done") return null;

  const base = `.atelier/epics/${state.epic_id}`;
  const lines: string[] = [
    `## atelier-kit — host plan (framework sequence)`,
    ``,
    `Use the host's plan tools for thinking, but **persist** work in the active Atelier epic artifacts below. Do not jump to a user-facing plan narrative until the planner step.`,
    ``,
    `**Pipeline order:** \`research.md\` (\`## Questions\` first, then the evidence sections) -> \`design.md\` when scheduled -> **then** \`plan.md\`.`,
    ``,
    `- **Epic directory:** \`${base}/\``,
    `- **Source of truth:** \`${base}/state.json\``,
  ];

  const task =
    state.tasks.find((t) => t.status === "in_progress") ??
    state.tasks.find((t) => t.status === "pending") ??
    null;
  if (!task) {
    lines.push(
      `- No pending framework task is recorded. If \`plan.md\` is complete, set \`status=planned\`, clear \`active_skill\`, and export the native mirror.`,
    );
    return clamp(lines.join("\n"));
  }

  const skill = taskTypeToSkillFolder(task.type);
  lines.push(
    ``,
    `### Active framework step`,
    ``,
    `- **Task:** \`${task.id}\` (${task.type})`,
    `- **Status:** \`${task.status}\``,
    `- **Skill:** \`.atelier/skills/${skill}.md\` (host planning checklist: \`.atelier/skills/host-plan-coach.md\` when installed)`,
    `- **Boundary:** work only on this task; do not fill later artifacts early.`,
    `- **Plannotator:** before marking this task done, run \`command -v plannotator\`; if present, run \`plannotator annotate ${base}/${task.artifact}\` and fold in any notes. Do not ask for a chat review instead.`,
    ``,
    `### Do now`,
    ``,
  );

  switch (task.type) {
    case "research":
    case "repo":
    case "tech":
    case "business":
      lines.push(
        `1. Fill the evidence sections of \`${base}/research.md\` (Codebase, Constraints, What exists vs what will be created, Open unknowns${state.mode === "deep" ? ", Product behavior" : ""}) with concrete paths, symbols and sources.`,
        `2. Keep the document consolidated and compact (target 50–300 lines); self-check research-ready: all required sections present, no \`_Pending._\`, seed questions replaced, within budget.`,
        `3. Mark this task done in \`${base}/state.json\` and advance \`active_skill\` to the next pending task.`,
      );
      break;
    case "design":
      lines.push(
        `1. Replace stubs in \`${base}/design.md\`: chosen design, contracts, design risks — and record decisions in ADR style under \`## Decisions\`.`,
        `2. In deep mode, also complete \`## Risk register\`, \`## Rollback\` and \`## Test strategy\`.`,
        `3. Mark this task done in \`${base}/state.json\` and advance to planning.`,
      );
      break;
    case "synthesis":
    case "planning":
      lines.push(
        `1. Write \`${base}/plan.md\` with \`## Goal\`, \`## Risks\`, and \`## Slices\` using \`### Slice N\` sections (each with **Goal:**, **Allowed files:**, **Acceptance criteria:**, **Validation:**).`,
        `2. Reflect the same slices in \`${base}/state.json\`; when ready, set \`status=planned\` and \`active_skill=null\`.`,
        `3. Treat \`plan.md\` as a living artifact: during implementation, record per-slice progress under \`## Progress\`.`,
      );
      break;
    case "questions":
      lines.push(
        `1. Replace the generic seed questions in the \`## Questions\` section of \`${base}/${task.artifact}\` with project-specific questions grouped by scope.`,
        `2. If nothing is open, state it explicitly in that section.`,
        `3. Mark this task done in \`${base}/state.json\` and advance to research.`,
      );
      break;
    default:
      lines.push(
        `1. Follow the skill for this task type and update the matching artifact under \`${base}/\`.`,
        `2. Update \`${base}/state.json\` when the task acceptance is satisfied.`,
      );
  }

  lines.push(
    ``,
    `**Do not** edit project source files during planning. The framework is complete when \`plan.md\` and \`state.json.slices\` are reviewable and the epic is \`planned\`.`,
  );

  return clamp(lines.join("\n"));
}

function clamp(s: string): string {
  if (s.length <= MAX_NUDGE) return s;
  return `${s.slice(0, MAX_NUDGE - 20)}\n…(truncated)`;
}
