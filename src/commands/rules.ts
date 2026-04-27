import { dirname, join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import pc from "picocolors";
import { readRule } from "../protocol/init.js";
import { AdapterSchema, type AdapterName } from "../protocol/schema.js";

async function writeAdapterRule(cwd: string, adapter: AdapterName, rendered: string): Promise<string[]> {
  const files: string[] = [];
  const write = async (relativePath: string, content = rendered) => {
    const path = join(cwd, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
    files.push(relativePath);
  };
  switch (adapter) {
    case "cursor":
      await write(".cursor/rules/atelier-core.mdc");
      break;
    case "claude-code":
    case "claude":
      await write("CLAUDE.md");
      break;
    case "codex":
    case "generic":
      await write("AGENTS.md");
      break;
    case "cline":
      await write(".clinerules/atelier-core.md");
      break;
    case "windsurf":
      await write(".windsurfrules");
      break;
  }
  return files;
}

export async function cmdRenderRules(
  cwd: string,
  adapterName: string,
  opts: { stdout?: boolean } = {},
): Promise<void> {
  const parsed = AdapterSchema.safeParse(adapterName);
  if (!parsed.success) {
    console.error(pc.red(`Invalid adapter: ${adapterName}`));
    process.exitCode = 1;
    return;
  }
  try {
    const rendered = await readRule(cwd, parsed.data as AdapterName);
    if (opts.stdout) {
      console.log(rendered);
      return;
    }
    const files = await writeAdapterRule(cwd, parsed.data as AdapterName, rendered);
    console.log(pc.green(`Rendered Atelier rules for ${parsed.data}: ${files.join(", ")}`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
