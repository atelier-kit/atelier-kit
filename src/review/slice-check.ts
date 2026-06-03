import { matchesAny } from "./glob.js";
import type { Slice } from "../work/types.js";

export type SliceMatch = {
  slice: Slice;
  /** Subset of changed files that match this slice's `allowed_files`. */
  matchedFiles: string[];
};

export type SliceCheckResult = {
  perSlice: SliceMatch[];
  /**
   * Changed files outside every slice's `allowed_files`. A non-empty list
   * means the implementation drifted beyond the declared contract.
   */
  violations: string[];
};

export function checkSlices(
  slices: Slice[],
  changedFiles: string[],
): SliceCheckResult {
  const perSlice: SliceMatch[] = slices.map((slice) => ({
    slice,
    matchedFiles: changedFiles.filter((file) =>
      matchesAny(file, slice.allowed_files),
    ),
  }));
  const violations = changedFiles.filter(
    (file) => !slices.some((slice) => matchesAny(file, slice.allowed_files)),
  );
  return { perSlice, violations };
}
