import { atelierDir } from "../fs-utils.js";
import type { AdapterName } from "./types.js";
import { applyClaude } from "./claude.js";
import { applyCursor } from "./cursor.js";
import { applyCodex } from "./codex.js";
import { applyWindsurf } from "./windsurf.js";
import { applyGeneric } from "./generic.js";
import { applyCline } from "./cline.js";
import { readAtelierConfig } from "../protocol/state.js";
import { readAtelierRc } from "../state/atelierrc.js";

export async function installAdapter(
  cwd: string,
  adapter: AdapterName,
): Promise<void> {
  const base = atelierDir(cwd);
  switch (adapter) {
    case "claude":
      await applyClaude(cwd, base);
      break;
    case "cursor":
      await applyCursor(cwd, base);
      break;
    case "codex":
      await applyCodex(cwd, base);
      break;
    case "windsurf":
      await applyWindsurf(cwd, base);
      break;
    case "cline":
      await applyCline(cwd, base);
      break;
    case "generic":
      await applyGeneric(cwd, base);
      break;
    default:
      throw new Error(`Unknown adapter: ${adapter}`);
  }
}

/** Re-run fallback generators after protocol state changes. */
export async function refreshFallbackAdapters(cwd: string): Promise<void> {
  let adapter: AdapterName;
  try {
    const config = await readAtelierConfig(cwd);
    adapter = (config.adapter === "claude-code" ? "claude" : config.adapter) as AdapterName;
  } catch {
    try {
      const rc = await readAtelierRc(cwd);
      adapter = rc.adapter;
    } catch {
      return;
    }
  }
  if (
    adapter === "generic" ||
    adapter === "windsurf" ||
    adapter === "codex" ||
    adapter === "cline"
  ) {
    await installAdapter(cwd, adapter);
  }
}
