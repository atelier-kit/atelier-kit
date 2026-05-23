import { renderAdapterBody, writeAdapterFile } from "./adapter-utils.js";
import { resolveAdapter, type AdapterSpec } from "./registry.js";
import type { AdapterName } from "./types.js";

export async function installAdapter(
  cwd: string,
  name: AdapterName,
): Promise<void> {
  const spec = resolveAdapter(name);
  if (!spec) throw new Error(`Unknown adapter: ${name}`);
  const defaultBody = spec.body
    ? await spec.body(cwd)
    : await renderAdapterBody(cwd, spec.name, spec.label);

  for (const file of spec.files) {
    const raw = file.body ? await file.body(cwd, defaultBody) : defaultBody;
    const content = file.wrap ? file.wrap(raw) : raw;
    await writeAdapterFile(cwd, file.path, content);
  }

  if (spec.extras) await spec.extras(cwd);
}

/** Concrete file paths an adapter install writes (used by `validate --verbose`). */
export function adapterInstalledPaths(name: AdapterName): string[] {
  const spec: AdapterSpec | undefined = resolveAdapter(name);
  return spec ? spec.files.map((f) => f.path) : [];
}
