import type { PlanSlice } from "./types.js";

export interface ParsedPlanSlice {
  title: string;
  goal: string;
  allowedFiles: string[];
  acceptanceCriteria: string[];
  validationSteps: string[];
}

export interface PlanDocumentCheck {
  goal: string | null;
  risksDocumented: boolean;
  slices: ParsedPlanSlice[];
  errors: string[];
}

export function hasMeaningfulText(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.replace(/[*_`]/g, "").trim();
  if (!normalized) return false;
  return !/^(tbd|\.\.\.|<.+>)$/i.test(normalized);
}

export function parsePlanDocument(content: string): PlanDocumentCheck {
  const errors: string[] = [];
  const goalSection = matchSection(content, "Goal");
  const goal = goalSection && hasMeaningfulText(firstMeaningfulLine(goalSection))
    ? firstMeaningfulLine(goalSection)
    : null;
  if (!goal) {
    errors.push("plan.md is missing a meaningful Goal section");
  }

  const slices: ParsedPlanSlice[] = [];
  const sliceRegex = /^### Slice \d+\s+[—-]\s+(.+)\n([\s\S]*?)(?=^---\s*$|^### Slice \d+\s+[—-]\s+|\Z)/gm;
  for (const match of content.matchAll(sliceRegex)) {
    const title = match[1].trim();
    const body = match[2];
    const goalMatch = body.match(/\*\*Goal:\*\*\s*(.+)/);
    const acceptanceBlock = between(body, "**Acceptance criteria:**", "**Validation:**");
    const validationBlock = after(body, "**Validation:**");
    const allowedFilesBlock = between(body, "**Allowed files:**", "**Acceptance criteria:**");
    const parsedSlice: ParsedPlanSlice = {
      title,
      goal: goalMatch?.[1]?.trim() ?? "",
      allowedFiles: extractBullets(allowedFilesBlock),
      acceptanceCriteria: extractBullets(acceptanceBlock),
      validationSteps: extractBullets(validationBlock),
    };
    if (!hasMeaningfulText(parsedSlice.goal)) {
      errors.push(`slice "${title}" is missing a meaningful goal`);
    }
    if (parsedSlice.acceptanceCriteria.filter(hasMeaningfulText).length === 0) {
      errors.push(`slice "${title}" is missing acceptance criteria`);
    }
    if (parsedSlice.validationSteps.filter(hasMeaningfulText).length === 0) {
      errors.push(`slice "${title}" is missing validation steps`);
    }
    slices.push(parsedSlice);
  }

  if (slices.length === 0) {
    errors.push("plan.md is missing slices");
  }

  const risksSection = matchSection(content, "Risks");
  const risksDocumented = Boolean(risksSection && hasMeaningfulText(stripRiskTableHeaders(risksSection)));
  if (!risksDocumented) {
    errors.push("plan.md is missing documented risks");
  }

  return { goal, risksDocumented, slices, errors };
}

export function planSlicesToStateSlices(slices: ParsedPlanSlice[]): PlanSlice[] {
  return slices.map((slice, index) => ({
    id: `slice-${String(index + 1).padStart(3, "0")}`,
    title: slice.title,
    status: "ready",
    goal: slice.goal,
    depends_on: [],
    allowed_files: slice.allowedFiles.filter(hasMeaningfulText),
    acceptance_criteria: slice.acceptanceCriteria.filter(hasMeaningfulText),
    validation: slice.validationSteps.filter(hasMeaningfulText),
  }));
}

function firstMeaningfulLine(content: string): string {
  for (const line of content.split(/\r?\n/)) {
    if (hasMeaningfulText(line)) return line.trim();
  }
  return "";
}

function matchSection(content: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^## ${escaped}\\n([\\s\\S]*?)(?=^## |\\Z)`, "m"));
  return match?.[1]?.trim() ?? null;
}

function between(content: string, start: string, end: string): string {
  const startIndex = content.indexOf(start);
  if (startIndex === -1) return "";
  const from = content.slice(startIndex + start.length);
  const endIndex = from.indexOf(end);
  return endIndex === -1 ? from : from.slice(0, endIndex);
}

function after(content: string, start: string): string {
  const startIndex = content.indexOf(start);
  if (startIndex === -1) return "";
  return content.slice(startIndex + start.length);
}

function extractBullets(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function stripRiskTableHeaders(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((line) => !/^\|[-| :]+\|?$/.test(line.trim()))
    .filter((line) => !/^\|\s*Risk\s*\|/i.test(line.trim()))
    .join("\n")
    .replace(/\|/g, " ")
    .trim();
}
