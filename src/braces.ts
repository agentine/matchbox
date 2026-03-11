/**
 * Brace expansion with ReDoS protection.
 * Replaces: braces
 */

import { fillRange, toRegexRange } from './range.js';

const MAX_DEPTH = 10;
const MAX_EXPANSION = 10_000;

/**
 * Expand braces to an array of strings.
 *
 * Supports: comma-separated ({a,b,c}), numeric ranges ({1..5}),
 * letter ranges ({a..e}), step ranges ({1..10..2}), zero-padded
 * ranges ({01..05}), nested braces ({a,b{1..3}}), and
 * prefix/suffix combinations (foo/{a,b}/bar).
 */
export function expand(pattern: string): string[] {
  return expandInner(pattern, 0);
}

/**
 * Compile braces to an optimized regex-ready string.
 *
 * E.g., braces("{a,b,c}") -> "(a|b|c)", braces("{1..5}") -> "([1-5])"
 */
export function braces(pattern: string): string {
  return bracesInner(pattern, 0);
}

// ---------------------------------------------------------------------------
// expand implementation
// ---------------------------------------------------------------------------

function expandInner(pattern: string, depth: number): string[] {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `Brace expansion exceeds maximum nesting depth (${MAX_DEPTH}). ` +
        `Deeply nested patterns are not supported.`
    );
  }

  const brace = findOutermostBrace(pattern);
  if (!brace) return [pattern];

  const { start, end, content } = brace;
  const prefix = pattern.slice(0, start);
  const suffix = pattern.slice(end + 1);

  // Try to expand the brace content
  const expanded = expandBraceContent(content, depth);

  if (expanded === null) {
    // Not a valid expansion (e.g., {a} with no comma/range).
    // Keep the braces literal and look for valid braces in the suffix.
    const literal = pattern.slice(0, end + 1);
    const suffixResults = expandInner(suffix, depth);
    return suffixResults.map((s) => literal + s);
  }

  // Combine each expansion with prefix/suffix, then recurse for remaining braces
  const results: string[] = [];
  for (const item of expanded) {
    const combined = prefix + item + suffix;
    const further = expandInner(combined, depth + 1);
    results.push(...further);
    if (results.length > MAX_EXPANSION) {
      throw new Error(
        `Brace expansion exceeds maximum output count (${MAX_EXPANSION}). ` +
          `Pattern may cause combinatorial explosion.`
      );
    }
  }

  return results;
}

/**
 * Expand the content inside a brace pair.
 * Returns null if the content is not a valid brace expansion
 * (e.g., single element with no comma and not a range).
 */
function expandBraceContent(
  content: string,
  depth: number
): string[] | null {
  const hasNestedBraces = content.includes('{');
  const hasComma = hasTopLevelComma(content);

  // No commas and no nested braces: only valid if it's a range pattern
  if (!hasComma && !hasNestedBraces) {
    const rangeMatch = content.match(
      /^(-?\w+)\.\.(-?\w+)(?:\.\.(-?\w+))?$/
    );
    if (rangeMatch) {
      const [, startStr, endStr, stepStr] = rangeMatch;
      const step = stepStr !== undefined ? Number(stepStr) : undefined;
      try {
        return fillRange(startStr, endStr, step);
      } catch {
        // Invalid range — not a valid expansion
      }
    }
    return null; // Single element, no comma, no range
  }

  // Split by top-level commas
  const parts = splitBraceCommas(content);

  if (parts.length === 1) {
    // No top-level commas but has nested braces.
    // Recursively expand the nested braces.
    return expandInner(parts[0], depth + 1);
  }

  // Multiple comma-separated parts: expand each recursively
  const results: string[] = [];
  for (const part of parts) {
    results.push(...expandInner(part, depth + 1));
    if (results.length > MAX_EXPANSION) {
      throw new Error(
        `Brace expansion exceeds maximum output count (${MAX_EXPANSION}). ` +
          `Pattern may cause combinatorial explosion.`
      );
    }
  }
  return results;
}

/**
 * Check if content has a comma at the top level (not inside nested braces).
 */
function hasTopLevelComma(content: string): boolean {
  let depth = 0;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\\') {
      i++;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Split brace content by commas at the top level (not inside nested braces).
 */
function splitBraceCommas(content: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\\') {
      current += ch;
      i++;
      if (i < content.length) current += content[i];
    } else if (ch === '{') {
      depth++;
      current += ch;
    } else if (ch === '}') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/**
 * Find the outermost (first matching) brace pair.
 */
function findOutermostBrace(
  pattern: string
): { start: number; end: number; content: string } | null {
  let depth = 0;
  let start = -1;

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '\\') {
      i++; // skip escaped character
      continue;
    }
    if (pattern[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (pattern[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return {
          start,
          end: i,
          content: pattern.slice(start + 1, i),
        };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// braces (regex mode) implementation
// ---------------------------------------------------------------------------

function bracesInner(pattern: string, depth: number): string {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `Brace expansion exceeds maximum nesting depth (${MAX_DEPTH}). ` +
        `Deeply nested patterns are not supported.`
    );
  }

  const brace = findOutermostBrace(pattern);
  if (!brace) return pattern;

  const { start, end, content } = brace;
  const prefix = pattern.slice(0, start);
  const suffix = pattern.slice(end + 1);

  const replacement = bracesContentToRegex(content, depth);
  if (replacement === null) {
    // Not a valid expansion — keep literal and process suffix
    return pattern.slice(0, end + 1) + bracesInner(suffix, depth);
  }

  const result = prefix + replacement + suffix;
  return bracesInner(result, depth + 1);
}

function bracesContentToRegex(
  content: string,
  depth: number
): string | null {
  const hasNestedBraces = content.includes('{');
  const hasComma = hasTopLevelComma(content);

  // No commas and no nested braces: only valid if it's a range
  if (!hasComma && !hasNestedBraces) {
    const rangeMatch = content.match(
      /^(-?\w+)\.\.(-?\w+)(?:\.\.(-?\w+))?$/
    );
    if (rangeMatch) {
      const [, startStr, endStr, stepStr] = rangeMatch;
      const step = stepStr !== undefined ? Number(stepStr) : undefined;

      // Letter range
      if (isLetter(startStr) && isLetter(endStr)) {
        if (step !== undefined && step !== 1) {
          // With step, expand and create alternation of specific values
          try {
            const values = fillRange(startStr, endStr, step);
            return `(${values.join('|')})`;
          } catch {
            // Invalid range — not a valid expansion
          }
        }
        const lo = startStr < endStr ? startStr : endStr;
        const hi = startStr < endStr ? endStr : startStr;
        return `([${lo}-${hi}])`;
      }
      // Numeric range
      const numStart = Number(startStr);
      const numEnd = Number(endStr);
      if (Number.isFinite(numStart) && Number.isFinite(numEnd)) {
        if (step !== undefined) {
          // With step, expand and create alternation of specific values
          // instead of generating a range regex that matches all numbers
          try {
            const values = fillRange(numStart, numEnd, step);
            return `(${values.join('|')})`;
          } catch {
            // Invalid range — not a valid expansion
          }
        }
        return `(${toRegexRange(numStart, numEnd)})`;
      }
    }
    return null; // Not a valid expansion
  }

  // Comma-separated or nested braces
  const parts = splitBraceCommas(content);

  if (parts.length === 1) {
    // Nested braces, no top-level comma
    return bracesInner(parts[0], depth + 1);
  }

  const regexParts = parts.map((p) => bracesInner(p, depth + 1));
  return `(${regexParts.join('|')})`;
}

function isLetter(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}
