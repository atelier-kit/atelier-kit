import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { isMode, type Mode, type ParsedWork, type Slice } from "./types.js";

/**
 * Extract the body of a top-level (`## `) section by name, up to the next
 * top-level heading or end of file. Returns "" when the section is absent.
 */
export function sectionBody(raw: string, heading: string): string {
  const re = new RegExp(
    `(?:^|\\n)##\\s+${heading}\\b[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i",
  );
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function parseTitle(raw: string, fallback: string): string {
  const m = raw.match(/^#\s+(?:Work:\s*)?(.+)$/m);
  return m ? m[1].trim() : fallback;
}

function parseMode(raw: string): Mode {
  const body = sectionBody(raw, "Mode").toLowerCase();
  const token = body.split(/\s|\n/).find((t) => isMode(t));
  return (token as Mode) ?? "standard";
}

/** Bullet lines (`- x`, `* x`, `- [ ] x`) within a block, cleaned up. */
function bulletList(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) =>
      line
        .replace(/^[-*]\s+/, "")
        .replace(/^\[[ xX]\]\s*/, "")
        .trim(),
    )
    .filter((line) => line.length > 0 && !isPlaceholder(line))
    // a fully inline-coded item like `` `pnpm test` `` → `pnpm test`
    .map((line) => line.replace(/^`([^`]+)`$/, "$1"));
}

function isPlaceholder(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  // Italic-wrapped placeholder prose, e.g. `_Pending._`, `_An observable …._`.
  if (/^_[^_].*_\.?$/.test(t)) return true;
  const stripped = t.replace(/[*_`]/g, "").trim().toLowerCase();
  if (!stripped) return true;
  return /^(pending|tbd|todo|n\/a|none)\b/.test(stripped);
}

/** Grab the text following a `**Label:**` marker up to the next marker. */
function fieldAfter(block: string, label: string): string {
  const re = new RegExp(
    `\\*\\*${label}:\\*\\*([\\s\\S]*?)(?=\\n\\s*\\*\\*[^*]+:\\*\\*|$)`,
    "i",
  );
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function parseAllowedFiles(field: string): string[] {
  const backticked = [...field.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  if (backticked.length > 0) return backticked.filter((f) => !isPlaceholder(f));
  return field
    .split(/[,\n]/)
    .map((t) => t.trim().replace(/^[-*]\s+/, ""))
    .filter((t) => t.length > 0 && !isPlaceholder(t));
}

function parseSlices(planBody: string): Slice[] {
  // Split the Plan section into `### ` blocks; keep only those that look like
  // slices (declare a Goal). The "Approach" subsection is skipped this way.
  const blocks = planBody.split(/\n(?=###\s+)/);
  const slices: Slice[] = [];
  let index = 0;
  for (const block of blocks) {
    const headingMatch = block.match(/^###\s+(.+)$/m);
    if (!headingMatch) continue;
    if (!/\*\*Goal:\*\*/i.test(block)) continue;
    index += 1;
    const rawTitle = headingMatch[1].trim();
    const title = rawTitle.replace(/^Slice\s+\d+\s*[—:-]\s*/i, "").trim() || rawTitle;
    const numMatch = rawTitle.match(/Slice\s+(\d+)/i);
    const id = numMatch ? `slice-${numMatch[1]}` : `slice-${index}`;
    slices.push({
      id,
      title,
      goal: fieldAfter(block, "Goal").replace(/^_+|_+$/g, "").trim(),
      allowed_files: parseAllowedFiles(fieldAfter(block, "Allowed files")),
      acceptance_criteria: bulletList(fieldAfter(block, "Acceptance criteria")),
      validation: bulletList(fieldAfter(block, "Validation")),
    });
  }
  return slices;
}

export function parseWork(raw: string, fallbackTitle = "work"): ParsedWork {
  const mode = parseMode(raw);
  const planBody = sectionBody(raw, "Plan");
  return {
    title: parseTitle(raw, fallbackTitle),
    mode,
    slices: mode === "quick" ? [] : parseSlices(planBody),
    raw,
  };
}

export async function parseWorkFile(path: string): Promise<ParsedWork> {
  const raw = await readFile(path, "utf8");
  return parseWork(raw, basename(path, ".md"));
}
