export type AdapterName =
  | "claude"
  | "cursor"
  | "codex"
  | "windsurf"
  | "cline"
  | "generic";

export interface AdapterWrite {
  path: string;
  content: string;
}
