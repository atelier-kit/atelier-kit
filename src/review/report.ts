import type { EpicState, ProtocolSlice } from "../protocol/schema.js";
import type { SliceMatch } from "./slice-check.js";
import type { ValidationResult, ValidationStatus } from "./validation-runner.js";

export type SliceReportInput = {
  slice: ProtocolSlice;
  matchedFiles: string[];
  validations: ValidationResult[];
};

export type ReviewReport = {
  markdown: string;
  /** True if any slice has a failed validation or the violations list is non-empty. */
  failed: boolean;
};

const STATUS_BADGE: Record<ValidationStatus, string> = {
  pass: "PASS",
  fail: "FAIL",
  timeout: "TIMEOUT",
  error: "ERROR",
};

function sliceBlock(input: SliceReportInput): string {
  const { slice, matchedFiles, validations } = input;
  const anyFailed = validations.some((v) => v.status !== "pass");
  const status = validations.length === 0
    ? "(no validation commands declared)"
    : anyFailed
      ? "FAIL"
      : "PASS";

  const filesBlock = matchedFiles.length === 0
    ? "_No changed files matched this slice's `allowed_files`._"
    : matchedFiles.map((file) => `- ${file}`).join("\n");

  const criteriaBlock = slice.acceptance_criteria.length === 0
    ? "_None declared._"
    : slice.acceptance_criteria.map((c) => `- [ ] ${c}`).join("\n");

  const validationBlocks = validations.length === 0
    ? "_No validation commands declared._"
    : validations.map((v) => {
        const summary = `${STATUS_BADGE[v.status]} \`${v.command}\` (${v.durationMs}ms${
          v.exitCode !== null ? `, exit ${v.exitCode}` : ""
        })`;
        const output = v.output
          ? `\n\n<details><summary>output</summary>\n\n\`\`\`\n${v.output}\n\`\`\`\n\n</details>`
          : "";
        return `- ${summary}${output}`;
      }).join("\n");

  return [
    `### ${slice.id} — ${slice.title}`,
    "",
    `**Status:** ${status}`,
    "",
    `**Goal:** ${slice.goal}`,
    "",
    `**Allowed files:** ${slice.allowed_files.map((p) => `\`${p}\``).join(", ") || "_None_"}`,
    "",
    `**Changed files in this slice's scope:**`,
    "",
    filesBlock,
    "",
    `**Acceptance criteria:**`,
    "",
    criteriaBlock,
    "",
    `**Validation:**`,
    "",
    validationBlocks,
    "",
  ].join("\n");
}

export function buildReview(params: {
  state: EpicState;
  changedFiles: string[];
  perSlice: SliceReportInput[];
  violations: string[];
}): ReviewReport {
  const { state, changedFiles, perSlice, violations } = params;
  const hasValidationFail = perSlice.some((s) =>
    s.validations.some((v) => v.status !== "pass"),
  );
  const failed = violations.length > 0 || hasValidationFail;

  const lines: string[] = [
    `# Review: ${state.title}`,
    "",
    "## Plan source",
    "",
    `- \`.atelier/epics/${state.epic_id}/plan.md\``,
    `- Baseline: \`${state.guards.baseline_ref}\``,
    "",
    "## Summary",
    "",
    `- Slices reviewed: ${perSlice.length}`,
    `- Changed files: ${changedFiles.length}`,
    `- Allowed-files violations: ${violations.length}`,
    `- Failed validations: ${
      perSlice.reduce(
        (n, s) => n + s.validations.filter((v) => v.status !== "pass").length,
        0,
      )
    }`,
    `- Overall: ${failed ? "FAIL" : "PASS"}`,
    "",
    "## Violations",
    "",
    violations.length === 0
      ? "_None — every changed file is covered by at least one slice's `allowed_files`._"
      : violations.map((file) => `- ${file}`).join("\n"),
    "",
    "## Slices",
    "",
  ];

  if (perSlice.length === 0) {
    lines.push("_No slices defined in this epic._", "");
  } else {
    for (const slice of perSlice) {
      lines.push(sliceBlock(slice));
    }
  }

  lines.push(
    "## Deviations",
    "",
    "Record any intentional drift from the plan here. Document the reason and",
    "whether the plan should be updated.",
    "",
    "- _None recorded._",
    "",
  );

  return { markdown: lines.join("\n"), failed };
}
