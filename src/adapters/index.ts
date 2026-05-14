import { atelierDir } from "../fs-utils.js";
import type { AdapterName } from "./types.js";
import { applyClaude } from "./claude.js";
import { applyCursor } from "./cursor.js";
import { applyCodex } from "./codex.js";
import { applyWindsurf } from "./windsurf.js";
import { applyGeneric } from "./generic.js";
import { applyCline } from "./cline.js";
import { applyGeminiCli } from "./gemini-cli.js";
import { applyAntigravity } from "./antigravity.js";
import { applyKiro } from "./kiro.js";
import { applyKilo } from "./kilo.js";
import { readAtelierConfig } from "../protocol/state.js";

export async function installAdapter(
  cwd: string,
  adapter: AdapterName,
): Promise<void> {
  const base = atelierDir(cwd);
  switch (adapter) {
    case "claude-code":
    case "claude":
      await applyClaude(cwd, base);
      break;
    case "cursor":
      await applyCursor(cwd, base);
      break;
    case "codex":
      await applyCodex(cwd, base);
      break;
    case "gemini-cli":
      await applyGeminiCli(cwd, base);
      break;
    case "antigravity":
      await applyAntigravity(cwd, base);
      break;
    case "kiro":
      await applyKiro(cwd, base);
      break;
    case "kilo":
      await applyKilo(cwd, base);
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

/** Re-run the configured adapter after protocol state changes so the
 *  injected status block reflects current state for every host. */
export async function refreshAdapter(cwd: string): Promise<void> {
  let adapter: AdapterName;
  try {
    const config = await readAtelierConfig(cwd);
    adapter = config.adapter as AdapterName;
  } catch {
    return;
  }
  await installAdapter(cwd, adapter);
}

/** @deprecated Use refreshAdapter. Kept as alias for transition. */
export const refreshFallbackAdapters = refreshAdapter;
