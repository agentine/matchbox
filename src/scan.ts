/**
 * Glob pattern scanning/parsing.
 * Replaces: picomatch scan functionality
 */

export interface ScanResult {
  /** The non-glob base directory (e.g., "src" from "src/**\/*.js") */
  base: string;
  /** The glob portion of the pattern (e.g., "**\/*.js") */
  glob: string;
  /** Whether the pattern contains glob characters */
  isGlob: boolean;
  /** Whether the pattern is negated (starts with !) */
  negated: boolean;
  /** The prefix before the glob portion (e.g., "src/") */
  prefix: string;
}

/** Characters that indicate a glob pattern */
const GLOB_CHARS = new Set(['*', '?', '[', '{', '(', '!']);

/**
 * Parse a glob pattern into its component parts.
 *
 * Extracts the non-glob base directory, the glob portion, negation
 * status, and other metadata useful for filesystem traversal.
 */
export function scan(pattern: string): ScanResult {
  if (pattern === '') {
    return { base: '.', glob: '', isGlob: false, negated: false, prefix: '' };
  }

  // Handle negation prefix
  let negated = false;
  let work = pattern;

  if (work.startsWith('!') && !work.startsWith('!(')) {
    negated = true;
    work = work.slice(1);
  }

  // Find where glob characters begin
  const globStart = findGlobStart(work);
  const isGlob = globStart !== -1;

  if (!isGlob) {
    // No glob characters — the entire pattern is a literal
    return {
      base: '.',
      glob: work,
      isGlob: false,
      negated,
      prefix: '',
    };
  }

  // Split at the last path separator before the glob starts
  const lastSepBeforeGlob = work.lastIndexOf('/', globStart);

  let base: string;
  let glob: string;
  let prefix: string;

  if (lastSepBeforeGlob === -1) {
    // No separator before glob — base is current directory
    base = '.';
    glob = work;
    prefix = negated ? '!' : '';
  } else {
    base = work.slice(0, lastSepBeforeGlob);
    glob = work.slice(lastSepBeforeGlob + 1);
    // Prefix includes the base path with trailing slash, and leading ! if negated
    prefix = (negated ? '!' : '') + work.slice(0, lastSepBeforeGlob + 1);
  }

  // Normalize empty base to "."
  if (base === '') {
    base = '.';
  }

  return {
    base,
    glob,
    isGlob,
    negated,
    prefix,
  };
}

/**
 * Find the index of the first unescaped glob character in the pattern.
 * Returns -1 if no glob characters are found.
 */
function findGlobStart(pattern: string): number {
  let inBracket = false;

  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];

    // Skip escaped characters
    if (ch === '\\') {
      i++;
      continue;
    }

    // Track bracket state (character classes are glob syntax themselves)
    if (ch === '[' && !inBracket) {
      return i;
    }

    if (ch === ']' && inBracket) {
      inBracket = false;
      continue;
    }

    // Detect glob characters
    if (ch === '*' || ch === '?') {
      return i;
    }

    // Brace expansion
    if (ch === '{') {
      // Only treat as glob if it looks like a valid brace expansion
      // (contains comma or range ..)
      if (looksLikeBraceExpansion(pattern, i)) {
        return i;
      }
    }

    // Extglobs: !(, ?(, *(, +(, @(
    if (
      (ch === '!' || ch === '?' || ch === '*' || ch === '+' || ch === '@') &&
      i + 1 < pattern.length &&
      pattern[i + 1] === '('
    ) {
      return i;
    }
  }

  return -1;
}

/**
 * Check if a brace at position `start` in `pattern` looks like
 * a valid brace expansion (has comma or range notation inside).
 */
function looksLikeBraceExpansion(pattern: string, start: number): boolean {
  let depth = 0;
  for (let i = start; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        // Found the matching close brace — check content
        const content = pattern.slice(start + 1, i);
        return content.includes(',') || /\.\./.test(content);
      }
    }
  }
  // Unmatched brace — not a valid expansion
  return false;
}
