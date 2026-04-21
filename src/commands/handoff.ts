import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readContext } from "../state/context.js";
import { atelierDir } from "../fs-utils.js";

export async function cmdHandoff(cwd: string): Promise<void> {
  const { meta, body } = await readContext(cwd);
  const base = atelierDir(cwd);
  const arts = [
    "questions.md",
    "research.md",
    "design.md",
    "outline.md",
    "plan.md",
    "impl-log.md",
    "review.md",
  ];
  console.log("# atelier-kit handoff\n");
  console.log("```yaml");
  console.log(JSON.stringify(meta, null, 2));
  console.log("```\n");
  if (body) {
    console.log("## Session notes\n\n", body, "\n");
  }
  for (const f of arts) {
    try {
      const t = await readFile(join(base, "artifacts", f), "utf8");
      console.log(`## ${f}\n\n`, t.slice(0, 2000), t.length > 2000 ? "\n…(truncated)\n" : "\n");
    } catch {
      // skip
    }
  }
}
