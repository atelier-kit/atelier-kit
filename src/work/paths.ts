import { join } from "node:path";
import { ATELIER_DIR } from "../paths.js";

/** Directory holding one markdown file per work item. */
export const WORK_DIR = join(ATELIER_DIR, "work");

export function workDir(cwd: string): string {
  return join(cwd, WORK_DIR);
}

export function workFilePath(cwd: string, slug: string): string {
  return join(workDir(cwd), `${slug}.md`);
}

/**
 * Turn a free-form title into a filesystem-safe slug. NFKD decomposes accented
 * characters; the non-alphanumeric pass then drops the combining marks, so
 * "Café Update" → "cafe-update".
 */
export function slugify(title: string): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "work";
}
