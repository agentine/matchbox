/**
 * Main API — micromatch-compatible interface.
 * Replaces: micromatch
 */

import { globRe, globMatch, isMatch as globIsMatch, type GlobOptions } from './glob.js';
import { scan } from './scan.js';

export type { GlobOptions } from './glob.js';
export type { ScanResult } from './scan.js';

/**
 * Test whether a string matches one or more glob patterns.
 *
 * If patterns is an array, the string must match at least one non-negated
 * pattern and must not match any negated pattern (patterns starting with !).
 */
export function isMatch(
  input: string,
  patterns: string | string[],
  options?: GlobOptions,
): boolean {
  if (typeof patterns === 'string') {
    return globIsMatch(input, patterns, options);
  }
  return matchesPatternArray(input, patterns, options);
}

/**
 * Filter a list of strings, returning only those that match the given
 * glob pattern(s).
 *
 * Negated patterns in an array act as exclusions.
 */
export function match(
  list: string[],
  patterns: string | string[],
  options?: GlobOptions,
): string[] {
  if (typeof patterns === 'string') {
    const fn = globMatch(patterns, options);
    return list.filter(fn);
  }
  return list.filter((item) => matchesPatternArray(item, patterns, options));
}

/**
 * Compile a glob pattern to a RegExp.
 */
export function makeRe(pattern: string, options?: GlobOptions): RegExp {
  return globRe(pattern, options);
}

/**
 * Return items from `list` that do **not** match the given pattern(s).
 */
export function not(
  list: string[],
  patterns: string | string[],
  options?: GlobOptions,
): string[] {
  if (typeof patterns === 'string') {
    const fn = globMatch(patterns, options);
    return list.filter((item) => !fn(item));
  }
  return list.filter((item) => !matchesPatternArray(item, patterns, options));
}

/**
 * Returns true if **any** string in the list matches **any** of the patterns.
 */
export function some(
  list: string[],
  patterns: string | string[],
  options?: GlobOptions,
): boolean {
  if (typeof patterns === 'string') {
    const fn = globMatch(patterns, options);
    return list.some(fn);
  }
  return list.some((item) => matchesPatternArray(item, patterns, options));
}

/**
 * Returns true if **every** string in the list matches at least one pattern.
 */
export function every(
  list: string[],
  patterns: string | string[],
  options?: GlobOptions,
): boolean {
  if (typeof patterns === 'string') {
    const fn = globMatch(patterns, options);
    return list.every(fn);
  }
  return list.every((item) => matchesPatternArray(item, patterns, options));
}

/**
 * Returns a filter function that tests strings against the pattern(s).
 */
export function filter(
  patterns: string | string[],
  options?: GlobOptions,
): (input: string) => boolean {
  if (typeof patterns === 'string') {
    return globMatch(patterns, options);
  }
  return (input: string) => matchesPatternArray(input, patterns, options);
}

/**
 * Parse a glob pattern into its component parts.
 */
export { scan } from './scan.js';

// ---- Internal helpers ----

/**
 * Evaluate a pattern array with include/exclude semantics:
 * - Non-negated patterns are includes (OR logic).
 * - Negated patterns (starting with !) are excludes.
 * - If only negated patterns exist, everything is included by default
 *   and then exclusions are applied.
 * - If both exist, the string must match at least one include AND
 *   must not match any exclude.
 */
function matchesPatternArray(
  input: string,
  patterns: string[],
  options?: GlobOptions,
): boolean {
  if (patterns.length === 0) return false;

  const includes: ((s: string) => boolean)[] = [];
  const excludes: ((s: string) => boolean)[] = [];

  for (const p of patterns) {
    if (p.startsWith('!') && !p.startsWith('!(')) {
      // Negated pattern — strip the ! and use the rest as an exclude.
      excludes.push(globMatch(p.slice(1), options));
    } else {
      includes.push(globMatch(p, options));
    }
  }

  // Check excludes first — if excluded, always reject.
  for (const fn of excludes) {
    if (fn(input)) return false;
  }

  // If no include patterns, only negated patterns existed —
  // treat as "match everything not excluded".
  if (includes.length === 0) {
    return true;
  }

  // Must match at least one include pattern.
  for (const fn of includes) {
    if (fn(input)) return true;
  }

  return false;
}

// ---- Default export ----

const matchbox = {
  isMatch,
  match,
  makeRe,
  not,
  some,
  every,
  filter,
  scan,
};

export default matchbox;
