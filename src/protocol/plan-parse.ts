import { readText } from "../fs-utils.js";
import { join } from "node:path";
import { epicDir } from "./paths.js";

export type PlanSliceCheck = {
  id: string;
  title: string;
  hasGoal: boolean;
  hasAcceptance: boolean;
  hasValidation: boolean;
  hasRisks: boolean;
};

export async function readPlanMd(
  cwd: string,
  epicSlug: string,
): Promise<string | null> {
  const p = join(epicDir(cwd, epicSlug), "plan.md");
  try {
    return await readText(p);
  } catch {
    return null;
  }
}

export function planHasGoal(content: string): boolean {
  return /^##\s+Goal\b/im.test(content);
}

export function planHasSlicesSection(content: string): boolean {
  return /^##\s+Slices\b/im.test(content);
}

/**
 * Parse slice subsections under ## Slices (### Slice N — Title).
 */
export function parsePlanSlices(content: string): PlanSliceCheck[] {
  const slices: PlanSliceCheck[] = [];
  const lines = content.split("\n");
  let inSlices = false;
  let current: PlanSliceCheck | null = null;

  for (const line of lines) {
    if (/^##\s+Slices\b/i.test(line.trim())) {
      inSlices = true;
      continue;
    }
    if (inSlices && /^##\s+/i.test(line.trim()) && !/^###\s+/i.test(line)) {
      if (current) slices.push(current);
      break;
    }
    if (!inSlices) continue;

    const m = line.match(/^###\s+Slice\s+(\d+)\s*[—-]\s*(.+)$/i);
    if (m) {
      if (current) slices.push(current);
      current = {
        id: `slice-${m[1]}`,
        title: m[2]!.trim(),
        hasGoal: false,
        hasAcceptance: false,
        hasValidation: false,
        hasRisks: false,
      };
      continue;
    }
    if (!current) continue;
    if (/^\*\*Goal:\*\*/i.test(line.trim()) || /^[-*]\s*\*\*Goal/i.test(line))
      current.hasGoal = true;
    if (/acceptance criteria/i.test(line)) current.hasAcceptance = true;
    if (/^\*\*Validation:\*\*/i.test(line.trim()) || /^##\s+Validation/i.test(line))
      current.hasValidation = true;
    if (/^##\s+Risks\b/i.test(line) || /^\*\*Risks/i.test(line)) current.hasRisks = true;
  }
  if (current) slices.push(current);

  if (slices.length === 0 && /^###\s+Slice\b/im.test(content)) {
    return parsePlanSlicesAlt(content);
  }
  return slices;
}

function parsePlanSlicesAlt(content: string): PlanSliceCheck[] {
  const out: PlanSliceCheck[] = [];
  const blocks = content.split(/^###\s+/m).slice(1);
  for (const block of blocks) {
    const firstLine = block.split("\n")[0] ?? "";
    if (!/^Slice\s+/i.test(firstLine)) continue;
    const m = firstLine.match(/^Slice\s+(\d+)/i);
    out.push({
      id: m ? `slice-${m[1]}` : `slice-${out.length + 1}`,
      title: firstLine.replace(/^Slice\s+\d+\s*[—-]?\s*/i, "").trim(),
      hasGoal: /\*\*Goal:\*\*/i.test(block) || /^##\s+Goal/im.test(block),
      hasAcceptance: /acceptance criteria/i.test(block),
      hasValidation: /\*\*Validation:\*\*/i.test(block),
      hasRisks: /^##\s+Risks\b/im.test(block) || /\|/.test(block),
    });
  }
  return out;
}

export function planHasDocumentedRisks(content: string): boolean {
  return /^##\s+Risks\b/im.test(content) && /\|/.test(content);
}

export function planHasValidationSteps(content: string): boolean {
  return /^##\s+Validation\b/im.test(content) || /\*\*Validation:\*\*/im.test(content);
}
