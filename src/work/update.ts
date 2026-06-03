/**
 * Replace (or append) the `## Review` section of a work file with fresh body.
 * Everything from the `## Review` heading onward is rewritten, so review is the
 * single mutable section the CLI owns.
 */
export function replaceReviewSection(raw: string, body: string): string {
  const trimmed = raw.replace(/\s+$/, "");
  const section = `## Review\n\n${body.trim()}\n`;
  const re = /\n##\s+Review\b[^\n]*\n[\s\S]*$/;
  if (re.test(trimmed)) {
    return `${trimmed.replace(re, "")}\n\n${section}`;
  }
  return `${trimmed}\n\n${section}`;
}
