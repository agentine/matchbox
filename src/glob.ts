/**
 * Core glob pattern matching engine.
 * Replaces: picomatch
 */

import { bracesForGlob, BRACE_OPEN, BRACE_CLOSE, BRACE_PIPE } from './braces.js';

export interface GlobOptions {
  /** Match dotfiles (hidden files starting with .) — default false */
  dot?: boolean;
  /** Case-insensitive matching — default false */
  nocase?: boolean;
  /** Match anywhere in the string (not just full path) — default false */
  contains?: boolean;
}

/**
 * Create a matcher function from a glob pattern.
 */
export function globMatch(
  pattern: string,
  options?: GlobOptions
): (input: string) => boolean {
  const re = globRe(pattern, options);
  return (input: string) => re.test(input);
}

/**
 * Compile a glob pattern to a RegExp.
 */
export function globRe(pattern: string, options?: GlobOptions): RegExp {
  const { dot = false, nocase = false, contains = false } = options ?? {};
  const flags = nocase ? 'i' : '';

  // Handle negation prefix
  let negated = false;
  let work = pattern;
  if (work.startsWith('!') && !work.startsWith('!(')) {
    negated = true;
    work = work.slice(1);
  }

  // Expand braces first
  work = expandBracesInPattern(work);

  // Convert glob to regex source
  const source = globToRegexSource(work, dot);

  const anchored = contains ? source : `^${source}$`;
  const re = new RegExp(anchored, flags);

  if (negated) {
    // For negated patterns, wrap: match if the regex does NOT match
    return new NegatedRegExp(re);
  }

  return re;
}

/**
 * Direct match test: returns true if string matches the glob pattern.
 */
export function isMatch(
  input: string,
  pattern: string,
  options?: GlobOptions
): boolean {
  return globMatch(pattern, options)(input);
}

// ---------------------------------------------------------------------------
// NegatedRegExp — a RegExp subclass that inverts test()
// ---------------------------------------------------------------------------

class NegatedRegExp extends RegExp {
  private _inner: RegExp;

  constructor(inner: RegExp) {
    // Create a valid parent regex — we override test() anyway
    super('(?:)', inner.flags);
    this._inner = inner;
  }

  override test(input: string): boolean {
    return !this._inner.test(input);
  }

  override exec(input: string): RegExpExecArray | null {
    // For negated patterns, exec returns a match object when
    // the inner pattern does NOT match
    if (!this._inner.test(input)) {
      const result = [input] as RegExpExecArray;
      result.index = 0;
      result.input = input;
      return result;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Brace expansion within glob patterns
// ---------------------------------------------------------------------------

function expandBracesInPattern(pattern: string): string {
  // Only process if the pattern actually contains braces
  if (!pattern.includes('{')) return pattern;

  try {
    return bracesForGlob(pattern);
  } catch {
    // If braces expansion fails, return original pattern
    return pattern;
  }
}

// ---------------------------------------------------------------------------
// POSIX character class mappings
// ---------------------------------------------------------------------------

const POSIX_CLASSES: Record<string, string> = {
  'alnum': 'a-zA-Z0-9',
  'alpha': 'a-zA-Z',
  'ascii': '\\x00-\\x7F',
  'blank': ' \\t',
  'cntrl': '\\x00-\\x1F\\x7F',
  'digit': '0-9',
  'graph': '!-~',
  'lower': 'a-z',
  'print': ' -~',
  'punct': '!-/:-@\\[-`{-~',
  'space': ' \\t\\n\\r\\f\\v',
  'upper': 'A-Z',
  'word': 'a-zA-Z0-9_',
  'xdigit': '0-9a-fA-F',
};

// ---------------------------------------------------------------------------
// Glob to regex source conversion
// ---------------------------------------------------------------------------

/**
 * Convert a glob pattern string to a regex source string.
 *
 * This is the core compilation function. It handles:
 * - * (any chars except /)
 * - ** (globstar — any chars including /)
 * - ? (single char except /)
 * - [...] (character classes, ranges, negation, POSIX classes)
 * - Extglobs: !(pat), ?(pat), *(pat), +(pat), @(pat)
 * - Backslash escaping
 * - Dot-file handling
 */
function globToRegexSource(pattern: string, dot: boolean, inQuantifierExtglob = false): string {
  const len = pattern.length;
  let result = '';
  let i = 0;

  // The "not-dot" prefix for segments: if dot=false, segments shouldn't
  // match files starting with "." unless the pattern explicitly has "."
  const notDot = dot ? '' : '(?!\\.)';

  // Track whether we are at the start of a path segment
  let segmentStart = true;

  while (i < len) {
    const ch = pattern[i];

    // Backslash escape — pass through the next char literally
    if (ch === '\\') {
      i++;
      if (i < len) {
        result += escapeRegex(pattern[i]);
        segmentStart = false;
        i++;
      }
      continue;
    }

    // Extglobs: !(pat), ?(pat), *(pat), +(pat), @(pat)
    // Must be checked BEFORE * and ? to avoid consuming the prefix char
    if (
      (ch === '!' || ch === '?' || ch === '*' || ch === '+' || ch === '@') &&
      i + 1 < len &&
      pattern[i + 1] === '('
    ) {
      const extResult = parseExtglob(pattern, i, dot, inQuantifierExtglob);
      if (extResult) {
        result += extResult.source;
        i = extResult.end;
        segmentStart = false;
        continue;
      }
    }

    // ** — globstar
    if (ch === '*' && i + 1 < len && pattern[i + 1] === '*') {
      // Consume the **
      i += 2;

      // Consume optional trailing /
      const hasTrailingSlash = i < len && pattern[i] === '/';
      if (hasTrailingSlash) i++;

      // ** matches zero or more path segments

      if (hasTrailingSlash) {
        // **/ — match zero or more complete segments (each ending with /)
        if (!dot) {
          result += `(?:${notDot}[^/]*\\/)*`;
        } else {
          result += '(?:[^/]*\\/)*';
        }
        segmentStart = true;
      } else if (i >= len) {
        // ** at end of pattern — match everything remaining
        if (!dot) {
          result += `(?:${notDot}[^/]*(?:\\/${notDot}[^/]*)*)?`;
        } else {
          result += '.*';
        }
        segmentStart = false;
      } else {
        // ** in middle without trailing / — match any path
        if (!dot) {
          result += `(?:${notDot}[^/]*(?:\\/${notDot}[^/]*)*\\/)?`;
        } else {
          result += '(?:.*\\/)?';
        }
        segmentStart = true;
      }
      continue;
    }

    // * — match anything except /
    if (ch === '*') {
      if (segmentStart && !dot) {
        result += `${notDot}[^/]*`;
      } else {
        result += '[^/]*';
      }
      segmentStart = false;
      i++;
      continue;
    }

    // ? — match single char except /
    if (ch === '?') {
      if (segmentStart && !dot) {
        result += `${notDot}[^/]`;
      } else {
        result += '[^/]';
      }
      segmentStart = false;
      i++;
      continue;
    }

    // [...] — character class
    if (ch === '[') {
      const classResult = parseCharacterClass(pattern, i);
      if (classResult) {
        result += classResult.source;
        i = classResult.end;
        segmentStart = false;
        continue;
      }
      // If parsing fails, treat [ as literal
      result += '\\[';
      segmentStart = false;
      i++;
      continue;
    }

    // Brace expansion sentinels → regex alternation operators
    if (ch === BRACE_OPEN) {
      result += '(';
      i++;
      continue;
    }
    if (ch === BRACE_CLOSE) {
      result += ')';
      i++;
      continue;
    }
    if (ch === BRACE_PIPE) {
      result += '|';
      i++;
      continue;
    }

    // Literal ( ) | — escape them (not from brace expansion)
    if (ch === '(' || ch === ')' || ch === '|') {
      result += '\\' + ch;
      segmentStart = false;
      i++;
      continue;
    }

    // / — path separator
    if (ch === '/') {
      result += '\\/';
      segmentStart = true;
      i++;
      continue;
    }

    // Regular character — escape and add
    result += escapeRegex(ch);
    segmentStart = false;
    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Character class parsing: [abc], [a-z], [!abc], [^abc], [:alpha:]
// ---------------------------------------------------------------------------

interface ParseResult {
  source: string;
  end: number;
}

function parseCharacterClass(
  pattern: string,
  start: number
): ParseResult | null {
  // start points to the opening [
  let i = start + 1;
  const len = pattern.length;

  if (i >= len) return null;

  let negated = false;
  if (pattern[i] === '!' || pattern[i] === '^') {
    negated = true;
    i++;
  }

  // Allow ] as first char in class (literal)
  let classContent = '';
  if (i < len && pattern[i] === ']') {
    classContent += '\\]';
    i++;
  }

  while (i < len) {
    const ch = pattern[i];

    if (ch === '\\') {
      // Escaped character inside class
      i++;
      if (i < len) {
        classContent += '\\' + pattern[i];
        i++;
      }
      continue;
    }

    if (ch === ']') {
      // End of character class
      const neg = negated ? '^' : '';
      return {
        source: `[${neg}${classContent}]`,
        end: i + 1,
      };
    }

    // POSIX character class [:name:]
    if (ch === '[' && i + 1 < len && pattern[i + 1] === ':') {
      const posixEnd = pattern.indexOf(':]', i + 2);
      if (posixEnd !== -1) {
        const className = pattern.slice(i + 2, posixEnd);
        const expansion = POSIX_CLASSES[className];
        if (expansion) {
          classContent += expansion;
          i = posixEnd + 2;
          continue;
        }
      }
    }

    classContent += ch;
    i++;
  }

  // No closing ] found — not a valid character class
  return null;
}

// ---------------------------------------------------------------------------
// Extglob parsing: !(pat|pat), ?(pat), *(pat), +(pat), @(pat)
// ---------------------------------------------------------------------------

function parseExtglob(
  pattern: string,
  start: number,
  dot: boolean,
  inQuantifierExtglob = false
): ParseResult | null {
  const type = pattern[start];
  // start+1 should be '('
  let i = start + 2;
  const len = pattern.length;

  // Find the matching close paren, handling nesting
  let depth = 1;
  let content = '';

  while (i < len && depth > 0) {
    const ch = pattern[i];
    if (ch === '\\') {
      content += ch;
      i++;
      if (i < len) {
        content += pattern[i];
        i++;
      }
      continue;
    }
    if (ch === '(') {
      depth++;
      content += ch;
      i++;
    } else if (ch === ')') {
      depth--;
      if (depth > 0) {
        content += ch;
      }
      i++;
    } else {
      content += ch;
      i++;
    }
  }

  if (depth !== 0) return null; // Unmatched paren

  // Determine if this extglob uses a quantifier (* or +).
  // If we're already inside a quantifier extglob, downgrade inner * and + to @
  // to prevent nested quantifiers (ReDoS via catastrophic backtracking).
  const isQuantifier = type === '*' || type === '+';
  const effectiveType = (inQuantifierExtglob && isQuantifier) ? '@' : type;
  const childInQuantifier = inQuantifierExtglob || isQuantifier;

  // Split by | at top level within the extglob
  const alternatives = splitExtglobAlternatives(content);

  // Convert each alternative to regex, propagating quantifier nesting flag
  const altSources = alternatives.map((alt) => globToRegexSource(alt, dot, childInQuantifier));
  const group = altSources.join('|');

  let source: string;
  switch (effectiveType) {
    case '!': {
      // !(pat) — match anything that does NOT match the full pattern.
      // We convert the remaining pattern after !(pat) into a regex suffix
      // and include it inside the lookahead so the negation applies to the
      // whole remaining input, not just the !(pat) fragment.
      const suffix = pattern.slice(i);
      const suffixRegex = suffix.length > 0
        ? globToRegexSource(suffix, dot, inQuantifierExtglob)
        : '';
      source = `(?!(?:${group})${suffixRegex}$)[^/]*?`;
      break;
    }
    case '?':
      // ?(pat) — match zero or one occurrence of pat
      source = `(?:${group})?`;
      break;
    case '*':
      // *(pat) — match zero or more occurrences of pat
      source = `(?:${group})*`;
      break;
    case '+':
      // +(pat) — match one or more occurrences of pat
      source = `(?:${group})+`;
      break;
    case '@':
      // @(pat) — match exactly one of the patterns
      source = `(?:${group})`;
      break;
    default:
      return null;
  }

  return { source, end: i };
}

function splitExtglobAlternatives(content: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\\') {
      current += ch;
      i++;
      if (i < content.length) current += content[i];
      continue;
    }
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === '|' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a character for use in a regex (glob context) */
function escapeRegex(ch: string): string {
  // These chars have special meaning in regex and must be escaped.
  // Note: *, ?, [, (, ), |, {, } are handled as glob syntax by the caller
  // and should also be escaped if they reach here as literal chars.
  if ('.+^${}()|[]\\*?'.includes(ch)) {
    return '\\' + ch;
  }
  return ch;
}
