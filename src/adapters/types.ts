export type AdapterName =
  | "claude"
  | "cursor"
  | "codex"
  | "windsurf"
  | "cline"
  | "kilo"
  | "antigravity"
  | "generic";

export interface AdapterWrite {
  path: string;
  content: string;
}
