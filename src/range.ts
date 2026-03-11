/**
 * Range filling and regex generation.
 * Replaces: fill-range, to-regex-range, is-number
 */

export interface FillRangeOptions {
  pad?: boolean;
  transform?: (value: string | number) => string;
}

/**
 * Check if a value is a finite number (or numeric string).
 */
export function isNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value));
  }
  return false;
}

const MAX_RANGE_SIZE = 100_000;

/**
 * Fill a range of numbers or letters.
 */
export function fillRange(
  start: number | string,
  end: number | string,
  stepOrOptions?: number | FillRangeOptions,
  options?: FillRangeOptions
): string[] {
  let step: number | undefined;
  let opts: FillRangeOptions | undefined;

  if (typeof stepOrOptions === 'object') {
    opts = stepOrOptions;
  } else {
    step = stepOrOptions;
    opts = options;
  }

  if (isLetterRange(start, end)) {
    return fillLetterRange(start as string, end as string, step, opts);
  }

  const numStart = typeof start === 'string' ? Number(start) : start;
  const numEnd = typeof end === 'string' ? Number(end) : end;

  if (!Number.isFinite(numStart) || !Number.isFinite(numEnd)) {
    throw new RangeError(`Invalid range: ${start}..${end}`);
  }

  return fillNumericRange(numStart, numEnd, step, opts, start, end);
}

function isLetterRange(start: number | string, end: number | string): boolean {
  return (
    typeof start === 'string' &&
    typeof end === 'string' &&
    start.length === 1 &&
    end.length === 1 &&
    isLetter(start) &&
    isLetter(end)
  );
}

function isLetter(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function fillLetterRange(
  start: string,
  end: string,
  step?: number,
  opts?: FillRangeOptions
): string[] {
  const startCode = start.charCodeAt(0);
  const endCode = end.charCodeAt(0);
  const descending = startCode > endCode;
  const absStep = Math.abs(step || 1);

  const rangeSize = Math.floor(Math.abs(endCode - startCode) / absStep) + 1;
  if (rangeSize > MAX_RANGE_SIZE) {
    throw new RangeError(`Range too large: ${rangeSize} elements (max ${MAX_RANGE_SIZE})`);
  }

  const results: string[] = [];

  if (descending) {
    for (let i = startCode; i >= endCode; i -= absStep) {
      let val = String.fromCharCode(i);
      if (opts?.transform) val = opts.transform(val);
      results.push(val);
    }
  } else {
    for (let i = startCode; i <= endCode; i += absStep) {
      let val = String.fromCharCode(i);
      if (opts?.transform) val = opts.transform(val);
      results.push(val);
    }
  }

  return results;
}

function fillNumericRange(
  start: number,
  end: number,
  step?: number,
  opts?: FillRangeOptions,
  rawStart?: number | string,
  rawEnd?: number | string
): string[] {
  const descending = start > end;
  const absStep = Math.abs(step || 1);

  const rangeSize = Math.floor(Math.abs(end - start) / absStep) + 1;
  if (rangeSize > MAX_RANGE_SIZE) {
    throw new RangeError(`Range too large: ${rangeSize} elements (max ${MAX_RANGE_SIZE})`);
  }

  const results: string[] = [];

  // Detect zero-padding from original string inputs
  let padWidth = 0;
  if (opts?.pad) {
    padWidth = Math.max(digitLength(String(rawStart)), digitLength(String(rawEnd)));
  } else if (typeof rawStart === 'string' && hasLeadingZero(rawStart)) {
    padWidth = Math.max(digitLength(String(rawStart)), digitLength(String(rawEnd)));
  } else if (typeof rawEnd === 'string' && hasLeadingZero(rawEnd)) {
    padWidth = Math.max(digitLength(String(rawStart)), digitLength(String(rawEnd)));
  }

  if (descending) {
    for (let i = start; i >= end; i -= absStep) {
      let val = padValue(i, padWidth);
      if (opts?.transform) val = opts.transform(val);
      results.push(val);
    }
  } else {
    for (let i = start; i <= end; i += absStep) {
      let val = padValue(i, padWidth);
      if (opts?.transform) val = opts.transform(val);
      results.push(val);
    }
  }

  return results;
}

/** Check if a string has leading zeros after stripping an optional minus sign. */
function hasLeadingZero(raw: string): boolean {
  const digits = raw.startsWith('-') ? raw.slice(1) : raw;
  return digits.length > 1 && digits[0] === '0';
}

/** Return the number of digit characters (excluding an optional leading minus sign). */
function digitLength(raw: string): number {
  return raw.startsWith('-') ? raw.length - 1 : raw.length;
}

function padValue(num: number, width: number): string {
  const str = String(Math.abs(num));
  if (width <= 0 || str.length >= width) return String(num);
  const padded = str.padStart(width, '0');
  return num < 0 ? `-${padded}` : padded;
}

// ---------------------------------------------------------------------------
// toRegexRange — generate optimized regex for matching a number range
// ---------------------------------------------------------------------------

/**
 * Generate an optimized regex string for matching a number range.
 */
export function toRegexRange(min: number, max: number): string {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new RangeError('toRegexRange: arguments must be finite numbers');
  }

  min = Math.trunc(min);
  max = Math.trunc(max);

  if (min > max) {
    [min, max] = [max, min];
  }

  if (min === max) {
    return String(min);
  }

  // Handle negative ranges
  if (min < 0 && max < 0) {
    return `-(?:${toRegexRange(Math.abs(max), Math.abs(min))})`;
  }

  if (min < 0) {
    const parts: string[] = [];
    parts.push(`-(?:${toRegexRange(1, Math.abs(min))})`);
    parts.push('0');
    if (max > 0) {
      parts.push(toRegexRange(1, max));
    }
    return parts.join('|');
  }

  const regexParts = toRegexParts(min, max);
  return regexParts.join('|');
}

/**
 * Recursively decompose [min, max] into sub-ranges, each expressible as
 * a compact digit-by-digit regex pattern.
 */
function toRegexParts(min: number, max: number): string[] {
  if (min === max) return [String(min)];

  const minStr = String(min);
  const maxStr = String(max);

  // Different digit lengths: split at power-of-10 boundaries
  if (minStr.length !== maxStr.length) {
    const parts: string[] = [];
    const boundary = 10 ** minStr.length - 1;
    parts.push(...toRegexParts(min, Math.min(boundary, max)));
    for (let len = minStr.length + 1; len < maxStr.length; len++) {
      parts.push(...toRegexParts(10 ** (len - 1), 10 ** len - 1));
    }
    if (maxStr.length > minStr.length) {
      parts.push(...toRegexParts(10 ** (maxStr.length - 1), max));
    }
    return parts;
  }

  // Same digit length
  const len = minStr.length;

  // Single digit: simple character class
  if (len === 1) return [digitRange(min, max)];

  // Find position where digits first differ
  let diffPos = 0;
  while (diffPos < len && minStr[diffPos] === maxStr[diffPos]) {
    diffPos++;
  }

  // Only the last digit differs — single character class
  if (diffPos === len - 1) {
    const prefix = minStr.slice(0, diffPos);
    return [prefix + digitRange(Number(minStr[diffPos]), Number(maxStr[diffPos]))];
  }

  const prefix = minStr.slice(0, diffPos);
  const loDigit = Number(minStr[diffPos]);
  const hiDigit = Number(maxStr[diffPos]);
  const remaining = len - diffPos - 1;

  // Check if suffixes are "clean" (all zeros for min, all nines for max)
  const minSuffixClean = minStr.slice(diffPos + 1) === '0'.repeat(remaining);
  const maxSuffixClean = maxStr.slice(diffPos + 1) === '9'.repeat(remaining);

  // Full uniform range — single pattern
  if (minSuffixClean && maxSuffixClean) {
    return [prefix + digitRange(loDigit, hiDigit) + '[0-9]'.repeat(remaining)];
  }

  const parts: string[] = [];
  let midLo = loDigit + 1;
  let midHi = hiDigit - 1;

  // Lower sub-range
  if (minSuffixClean) {
    midLo = loDigit; // absorb into middle
  } else {
    const lowerMax = Number(minStr.slice(0, diffPos + 1) + '9'.repeat(remaining));
    parts.push(...toRegexParts(min, lowerMax));
  }

  // Upper sub-range (compute before adding middle)
  let upperParts: string[] | undefined;
  if (maxSuffixClean) {
    midHi = hiDigit; // absorb into middle
  } else {
    const upperMin = Number(maxStr.slice(0, diffPos + 1) + '0'.repeat(remaining));
    upperParts = toRegexParts(upperMin, max);
  }

  // Middle: full digit ranges
  if (midLo <= midHi) {
    parts.push(prefix + digitRange(midLo, midHi) + '[0-9]'.repeat(remaining));
  }

  if (upperParts) {
    parts.push(...upperParts);
  }

  return parts;
}

function digitRange(lo: number, hi: number): string {
  if (lo === hi) return String(lo);
  if (lo === 0 && hi === 9) return '[0-9]';
  if (hi - lo === 1) return `[${lo}${hi}]`;
  return `[${lo}-${hi}]`;
}
