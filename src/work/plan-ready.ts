import type { ParsedWork, Slice } from "./types.js";

export type PlanReadyReport = {
  errors: string[];
  warnings: string[];
  /** quick mode dispenses with the contract entirely. */
  skipped: boolean;
};

// A pattern is "catch-all" when the framework cannot meaningfully tell whether
// a change belongs to the slice or is drift: a pure wildcard, or a single
// top-level segment followed by a recursive glob (e.g. "src/**").
function isCatchAllPattern(pattern: string): boolean {
  const segments = pattern.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return true;
  if (segments.length === 1 && (segments[0] === "*" || segments[0] === "**")) {
    return true;
  }
  const nonWildcard = segments.filter((s) => s !== "**" && s !== "*");
  return segments.includes("**") && nonWildcard.length <= 1;
}

const VAGUE_CRITERION =
  /\b(works?|is\s+correct|is\s+implemented|is\s+done|works?\s+correctly|complete[ds]?)\b/i;

function isCriterionVague(criterion: string): boolean {
  const trimmed = criterion.trim();
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 8) return true;
  return VAGUE_CRITERION.test(trimmed) && wordCount < 12;
}

const EXECUTABLE_HINT =
  /\b(npm|pnpm|yarn|node|bun|deno|python|pip|pytest|tox|cargo|go|rake|mvn|gradle|make|sh|bash|zsh|fish|docker|kubectl|helm|terraform|jest|vitest|mocha|playwright|cypress|tsc|eslint|prettier|ruff|mypy|black|psql|sqlite3|curl|wget|http|hurl|atelier)\b/i;

function looksExecutable(step: string): boolean {
  return EXECUTABLE_HINT.test(step);
}

/** True when the `## Risks` section is missing, blank, or placeholder-only. */
export function risksAreEmpty(raw: string): boolean {
  const match = raw.match(/##\s+Risks\b([\s\S]*?)(?=\n##\s|\n#\s|$)/i);
  if (!match) return true;
  const body = match[1].trim();
  if (!body) return true;
  const stripped = body.replace(/[*_`]/g, "").toLowerCase();
  const informative = stripped
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^[|:\-\s]+$/.test(line) &&
        !/^\|\s*risk\s*\|.*impact.*\|.*mitigation\s*\|?$/i.test(line),
    );
  if (informative.length === 0) return true;
  return informative.every(
    (line) =>
      /\b(none|pending|tbd|todo|n\/a)\b\.?$/.test(line.replace(/\|/g, " ").trim()) ||
      /^(none|pending|tbd|todo|n\/a)\b/i.test(line.replace(/^\|+\s*/, "").trim()),
  );
}

function checkSlice(slice: Slice, errors: string[], warnings: string[]): void {
  if (!slice.goal.trim()) errors.push(`slice ${slice.id} missing goal`);
  if (slice.acceptance_criteria.length === 0) {
    errors.push(`slice ${slice.id} missing acceptance criteria`);
  }
  if (slice.validation.length === 0) {
    errors.push(`slice ${slice.id} missing validation steps`);
  }
  if (slice.allowed_files.length === 0) {
    errors.push(
      `slice ${slice.id} missing allowed_files (declare which paths this slice may modify)`,
    );
  } else {
    const catchAll = slice.allowed_files.find(isCatchAllPattern);
    if (catchAll) {
      errors.push(
        `slice ${slice.id} allowed_files pattern "${catchAll}" is too broad for review; restrict to specific files or sub-paths (e.g. "src/auth/**" or "src/auth/login.ts")`,
      );
    }
  }
  for (const criterion of slice.acceptance_criteria) {
    if (isCriterionVague(criterion)) {
      warnings.push(
        `slice ${slice.id} acceptance criterion is vague: "${criterion}" — rewrite as an observable condition (>=8 words, avoid "works"/"is correct")`,
      );
    }
  }
  if (slice.validation.length > 0 && !slice.validation.some(looksExecutable)) {
    warnings.push(
      `slice ${slice.id} validation has no recognizable executable command (atelier review cannot run prose like "${slice.validation[0]}"); include at least one shell-runnable step`,
    );
  }
}

/**
 * Mode-scaled contract check:
 * - quick: skipped (advisory; no slices required);
 * - standard: slices with allowed_files + observable criteria + validation;
 * - deep: same, plus a populated `## Risks` section.
 */
export function planReady(work: ParsedWork): PlanReadyReport {
  if (work.mode === "quick") {
    return { errors: [], warnings: [], skipped: true };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (work.slices.length === 0) {
    errors.push(
      "no slices found under ## Plan (standard/deep modes need at least one slice with Goal/Allowed files/Acceptance criteria/Validation)",
    );
  }
  for (const slice of work.slices) checkSlice(slice, errors, warnings);

  if (work.mode === "deep" && risksAreEmpty(work.raw)) {
    errors.push(
      "deep mode requires a populated ## Risks section (placeholders like _None._ or _Pending_ are not enough)",
    );
  }

  return { errors, warnings, skipped: false };
}
