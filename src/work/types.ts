// The minimal, markdown-first model. A "work" is one `.atelier/work/<slug>.md`
// file. The only structured thing the CLI parses out of it is the slice
// contract under `## Plan` (used by `validate` and `review`).

export type Mode = "quick" | "standard" | "deep";

export const MODES: readonly Mode[] = ["quick", "standard", "deep"] as const;

export function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

/** A planned slice — the verifiable contract for one vertical change. */
export type Slice = {
  id: string;
  title: string;
  goal: string;
  allowed_files: string[];
  acceptance_criteria: string[];
  validation: string[];
};

export type ParsedWork = {
  /** Title from the `# Work: <title>` heading (or the file slug as fallback). */
  title: string;
  mode: Mode;
  /** Slices parsed from the `## Plan` section. Empty for quick mode. */
  slices: Slice[];
  /** Raw markdown of the whole file (used for `## Risks` checks and review). */
  raw: string;
};
