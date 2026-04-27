export type AdapterName =
  | "claude-code"
  | "claude"
  | "cursor"
  | "codex"
  | "gemini-cli"
  | "antigravity"
  | "kiro"
  | "kilo"
  | "windsurf"
  | "cline"
  | "generic";

export interface AdapterWrite {
  path: string;
  content: string;
}

export type AdapterCapability =
  | "rules"
  | "commands"
  | "skills"
  | "hooks"
  | "systemPrompt";

export interface AgentAdapter {
  name: AdapterName;
  displayName: string;
  capabilities: AdapterCapability[];
  install(cwd: string, atelier: string): Promise<void>;
}
