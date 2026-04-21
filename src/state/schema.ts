import { z } from "zod";

export const AdapterSchema = z.enum([
  "claude",
  "cursor",
  "codex",
  "windsurf",
  "generic",
]);

export const ModeSchema = z.enum(["quick", "standard", "deep"]);

export const PhaseSchema = z.enum([
  "brief",
  "questions",
  "research",
  "market-research",
  "design",
  "outline",
  "plan",
  "implement",
  "review",
  "ship",
  "learn",
]);

export const AtelierRcSchema = z.object({
  version: z.number().default(1),
  adapter: AdapterSchema.default("generic"),
  mode: ModeSchema.default("standard"),
});

export type AtelierRc = z.infer<typeof AtelierRcSchema>;

export const ReturnEntrySchema = z.object({
  from: PhaseSchema,
  to: PhaseSchema,
  reason: z.string(),
  at: z.string(),
});

export const ContextMetaSchema = z.object({
  atelier_context_version: z.literal(1).default(1),
  phase: PhaseSchema.default("brief"),
  mode: ModeSchema.optional(),
  adapter: AdapterSchema.optional(),
  gate_pending: z.string().nullable().optional(),
  updated_at: z.string(),
  returns: z.array(ReturnEntrySchema).default([]),
});

export type ContextMeta = z.infer<typeof ContextMetaSchema>;
export type Phase = z.infer<typeof PhaseSchema>;
