import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ATELIER_DIR } from "./paths.js";

export async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

export async function copyTree(
  src: string,
  dest: string,
): Promise<void> {
  await cp(src, dest, { recursive: true });
}

export async function readText(p: string): Promise<string> {
  return readFile(p, "utf8");
}

export async function writeText(p: string, content: string): Promise<void> {
  await ensureDir(dirname(p));
  await writeFile(p, content, "utf8");
}

export function atelierDir(cwd: string): string {
  return join(cwd, ATELIER_DIR);
}
