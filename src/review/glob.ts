// Minimal glob matcher for `allowed_files` patterns. Handles exact paths,
// single-segment `*` (one path segment), and recursive `**` (any depth).
// Paths are treated as POSIX-style; no separator normalization. No deps.
function escapeRegex(s: string): string {
  return s.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

export function compileGlob(pattern: string): RegExp {
  // Tokenize pattern into literal segments and glob tokens so we can escape
  // safely. Order matters: `**` must be matched before `*`.
  let regex = "";
  let i = 0;
  while (i < pattern.length) {
    if (pattern.startsWith("**", i)) {
      regex += ".*";
      i += 2;
      // skip a trailing `/` so `src/**` matches `src/x` (not just `src//x`)
      if (pattern[i] === "/") i += 1;
    } else if (pattern[i] === "*") {
      regex += "[^/]*";
      i += 1;
    } else if (pattern[i] === "?") {
      regex += "[^/]";
      i += 1;
    } else {
      regex += escapeRegex(pattern[i]);
      i += 1;
    }
  }
  return new RegExp(`^${regex}$`);
}

export function matchesGlob(filePath: string, pattern: string): boolean {
  return compileGlob(pattern).test(filePath);
}

export function matchesAny(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesGlob(filePath, pattern));
}
