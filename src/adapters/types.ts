export type AdapterName =
  | "claude"
  | "cursor"
  | "codex"
  | "windsurf"
  | "generic";

export interface AdapterWrite {
  path: string;
  content: string;
}
