import matter from "gray-matter";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ContextMetaSchema, type ContextMeta, type Phase } from "./schema.js";
import { ATELIER_DIR, CONTEXT_FILE } from "../paths.js";

export function atelierPath(cwd: string, ...parts: string[]): string {
  return join(cwd, ATELIER_DIR, ...parts);
}

export async function readContext(cwd: string): Promise<{
  meta: ContextMeta;
  body: string;
}> {
  const p = atelierPath(cwd, CONTEXT_FILE);
  const raw = await readFile(p, "utf8");
  const { data, content } = matter(raw);
  const meta = ContextMetaSchema.parse(data);
  return { meta, body: content.trim() };
}

export async function writeContext(
  cwd: string,
  meta: ContextMeta,
  body = "",
): Promise<void> {
  const p = atelierPath(cwd, CONTEXT_FILE);
  const yaml = {
    ...meta,
    updated_at: new Date().toISOString(),
  };
  const out = matter.stringify(body ? `${body}\n` : "\n", yaml);
  await writeFile(p, out, "utf8");
}

export function defaultContextMeta(
  partial?: Partial<ContextMeta>,
): ContextMeta {
  return ContextMetaSchema.parse({
    atelier_context_version: 1,
    phase: "brief",
    updated_at: new Date().toISOString(),
    returns: [],
    ...partial,
  });
}

export async function setPhase(cwd: string, phase: Phase): Promise<void> {
  const { meta, body } = await readContext(cwd);
  await writeContext(cwd, { ...meta, phase }, body);
}

export async function appendReturn(
  cwd: string,
  entry: {
    from: Phase;
    to: Phase;
    reason: string;
  },
): Promise<void> {
  const { meta, body } = await readContext(cwd);
  const at = new Date().toISOString();
  await writeContext(
    cwd,
    {
      ...meta,
      returns: [...meta.returns, { ...entry, at }],
    },
    body,
  );
}
