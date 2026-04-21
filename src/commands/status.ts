import pc from "picocolors";
import { readContext } from "../state/context.js";
import { readAtelierRc } from "../state/atelierrc.js";

export async function cmdStatus(cwd: string): Promise<void> {
  const { meta, body } = await readContext(cwd);
  let rc;
  try {
    rc = await readAtelierRc(cwd);
  } catch {
    rc = null;
  }

  console.log(pc.bold("Session"));
  console.log(`  phase:          ${pc.cyan(meta.phase)}`);
  console.log(`  gate_pending:   ${meta.gate_pending ?? "—"}`);
  console.log(`  updated_at:     ${meta.updated_at}`);
  if (rc) {
    console.log(`  adapter (.atelierrc): ${rc.adapter}`);
    console.log(`  mode:                  ${rc.mode}`);
  }
  console.log(`  returns:         ${meta.returns.length}`);
  if (meta.returns.length) {
    for (const r of meta.returns) {
      console.log(pc.dim(`    - ${r.from} → ${r.to}: ${r.reason}`));
    }
  }
  if (body) {
    console.log(pc.bold("\nNotes"));
    console.log(body);
  }
}
