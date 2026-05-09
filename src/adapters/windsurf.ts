import { join } from "node:path";
import { writeText } from "../fs-utils.js";
import { renderAdapterBody } from "./adapter-utils.js";

export async function applyWindsurf(
  cwd: string,
  _atelier: string,
): Promise<void> {
  const rules = await renderAdapterBody(cwd, "windsurf", "atelier-kit — .windsurfrules");

  await writeText(join(cwd, ".windsurfrules"), rules);
}
