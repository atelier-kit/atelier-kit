import type { ContextMeta } from "../state/schema.js";

export interface IContextRepository {
  read(cwd: string): Promise<{ meta: ContextMeta; body: string }>;
  write(cwd: string, meta: ContextMeta, body?: string): Promise<void>;
  default(partial?: Partial<ContextMeta>): ContextMeta;
}
