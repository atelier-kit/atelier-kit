/**
 * Minimal glob match for paths like `.atelier/**` (forward slashes).
 */
export function pathMatchesGlob(filePath: string, pattern: string): boolean {
  const norm = filePath.replace(/\\/g, "/").replace(/^\.?\//, "");
  const pat = pattern.replace(/\\/g, "/").replace(/^\.?\//, "");
  const regex = globToRegex(pat);
  return regex.test(norm);
}

function globToRegex(pattern: string): RegExp {
  let s = "";
  let i = 0;
  while (i < pattern.length) {
    if (pattern.slice(i, i + 2) === "**") {
      s += ".*";
      i += 2;
      continue;
    }
    const c = pattern[i]!;
    if (c === "*") {
      s += "[^/]*";
    } else if (".^$+()[]{}|".includes(c)) {
      s += `\\${c}`;
    } else if (c === "?") {
      s += "[^/]";
    } else {
      s += c;
    }
    i++;
  }
  return new RegExp(`^${s}$`);
}
