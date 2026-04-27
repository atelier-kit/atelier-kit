import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import pc from "picocolors";
import { readRule } from "../protocol/init.js";
import { AdapterSchema, type AdapterName } from "../protocol/schema.js";

export async function cmdRenderRules(
  cwd: string,
  adapterName: string,
): Promise<void> {
  const parsed = AdapterSchema.safeParse(adapterName);
  if (!parsed.success) {
    console.error(pc.red(`Invalid adapter: ${adapterName}`));
    process.exitCode = 1;
    return;
  }
  try {
    const rendered = await readRule(cwd, parsed.data as AdapterName);
    if (parsed.data === "generic") {
      await writeFile(join(cwd, "atelier-system-prompt.txt"), rendered, "utf8");
    }
    console.log(rendered);
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
