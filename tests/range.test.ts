import { describe, it, expect } from 'vitest';
import { fillRange, toRegexRange, isNumber } from '../src/range.js';

// ---------------------------------------------------------------------------
// isNumber
// ---------------------------------------------------------------------------
describe('isNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(5)).toBe(true);
    expect(isNumber(-3)).toBe(true);
    expect(isNumber(3.14)).toBe(true);
  });

  it('returns true for numeric strings', () => {
    expect(isNumber('0')).toBe(true);
    expect(isNumber('5')).toBe(true);
    expect(isNumber('-3')).toBe(true);
    expect(isNumber('3.14')).toBe(true);
    expect(isNumber('  42  ')).toBe(true);
  });

  it('returns false for NaN', () => {
    expect(isNumber(NaN)).toBe(false);
  });

  it('returns false for Infinity', () => {
    expect(isNumber(Infinity)).toBe(false);
    expect(isNumber(-Infinity)).toBe(false);
  });

  it('returns false for non-numeric values', () => {
    expect(isNumber(null)).toBe(false);
    expect(isNumber(undefined)).toBe(false);
    expect(isNumber('')).toBe(false);
    expect(isNumber('  ')).toBe(false);
    expect(isNumber('abc')).toBe(false);
    expect(isNumber(true)).toBe(false);
    expect(isNumber(false)).toBe(false);
    expect(isNumber({})).toBe(false);
    expect(isNumber([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fillRange
// ---------------------------------------------------------------------------
describe('fillRange', () => {
  describe('numeric ranges', () => {
    it('fills ascending numeric range', () => {
      expect(fillRange(1, 5)).toEqual(['1', '2', '3', '4', '5']);
    });

    it('fills descending numeric range', () => {
      expect(fillRange(5, 1)).toEqual(['5', '4', '3', '2', '1']);
    });

    it('fills range with step', () => {
      expect(fillRange(1, 10, 2)).toEqual(['1', '3', '5', '7', '9']);
    });

    it('fills range with step (descending)', () => {
      expect(fillRange(10, 1, 2)).toEqual(['10', '8', '6', '4', '2']);
    });

    it('fills single-element range', () => {
      expect(fillRange(5, 5)).toEqual(['5']);
    });

    it('fills range with negative numbers', () => {
      expect(fillRange(-3, 3)).toEqual(['-3', '-2', '-1', '0', '1', '2', '3']);
    });

    it('fills range starting from zero', () => {
      expect(fillRange(0, 4)).toEqual(['0', '1', '2', '3', '4']);
    });

    it('fills range with string number inputs', () => {
      expect(fillRange('1', '5')).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('zero-padding', () => {
    it('auto-detects zero-padding from string inputs', () => {
      expect(fillRange('01', '05')).toEqual(['01', '02', '03', '04', '05']);
    });

    it('auto-detects from end string', () => {
      expect(fillRange('1', '05')).toEqual(['01', '02', '03', '04', '05']);
    });

    it('pads with explicit pad option', () => {
      expect(fillRange(1, 5, { pad: true })).toEqual(['1', '2', '3', '4', '5']);
    });

    it('pads to width of larger number', () => {
      expect(fillRange(1, 100, { pad: true })).toHaveLength(100);
      expect(fillRange(1, 100, { pad: true })[0]).toBe('001');
      expect(fillRange(1, 100, { pad: true })[99]).toBe('100');
    });

    it('zero-pads three-digit range', () => {
      expect(fillRange('001', '003')).toEqual(['001', '002', '003']);
    });

    it('auto-detects zero-padding for negative strings', () => {
      expect(fillRange('-01', '-05')).toEqual(['-01', '-02', '-03', '-04', '-05']);
    });

    it('auto-detects zero-padding for negative three-digit strings', () => {
      expect(fillRange('-001', '-003')).toEqual(['-001', '-002', '-003']);
    });

    it('handles cross-zero range with zero-padded inputs', () => {
      expect(fillRange('-02', '02')).toEqual(['-02', '-01', '00', '01', '02']);
    });
  });

  describe('letter ranges', () => {
    it('fills ascending letter range', () => {
      expect(fillRange('a', 'e')).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('fills descending letter range', () => {
      expect(fillRange('e', 'a')).toEqual(['e', 'd', 'c', 'b', 'a']);
    });

    it('fills uppercase letter range', () => {
      expect(fillRange('A', 'E')).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('fills letter range with step', () => {
      expect(fillRange('a', 'j', 2)).toEqual(['a', 'c', 'e', 'g', 'i']);
    });

    it('fills single letter range', () => {
      expect(fillRange('a', 'a')).toEqual(['a']);
    });
  });

  describe('transform option', () => {
    it('applies transform function to each value', () => {
      const result = fillRange(1, 3, {
        transform: (v) => `item-${v}`,
      });
      expect(result).toEqual(['item-1', 'item-2', 'item-3']);
    });
  });

  describe('edge cases', () => {
    it('throws for invalid range', () => {
      expect(() => fillRange('x', 5)).toThrow('Invalid range');
    });

    it('handles same start and end', () => {
      expect(fillRange(7, 7)).toEqual(['7']);
    });
  });
});

// ---------------------------------------------------------------------------
// toRegexRange
// ---------------------------------------------------------------------------
describe('toRegexRange', () => {
  // Helper: verify regex matches exactly the expected range
  function verifyRange(min: number, max: number) {
    const regex = toRegexRange(min, max);
    const re = new RegExp(`^(?:${regex})$`);
    for (let i = Math.min(min, max) - 2; i <= Math.max(min, max) + 2; i++) {
      const matches = re.test(String(i));
      const expected = i >= Math.min(min, max) && i <= Math.max(min, max);
      if (matches !== expected) {
        throw new Error(
          `toRegexRange(${min}, ${max}) = "${regex}" ` +
            `at ${i}: got ${matches}, expected ${expected}`
        );
      }
    }
  }

  describe('single digit ranges', () => {
    it('matches single number', () => {
      expect(toRegexRange(5, 5)).toBe('5');
      verifyRange(5, 5);
    });

    it('matches digit range', () => {
      expect(toRegexRange(1, 9)).toBe('[1-9]');
      verifyRange(1, 9);
    });

    it('matches small range', () => {
      expect(toRegexRange(1, 5)).toBe('[1-5]');
      verifyRange(1, 5);
    });

    it('matches two adjacent digits', () => {
      expect(toRegexRange(3, 4)).toBe('[34]');
      verifyRange(3, 4);
    });

    it('matches full digit range', () => {
      expect(toRegexRange(0, 9)).toBe('[0-9]');
      verifyRange(0, 9);
    });
  });

  describe('multi-digit ranges', () => {
    it('matches 1-100', () => {
      const regex = toRegexRange(1, 100);
      expect(regex).toBe('[1-9]|[1-9][0-9]|100');
      verifyRange(1, 100);
    });

    it('matches 0-255 (IP octet)', () => {
      const regex = toRegexRange(0, 255);
      expect(regex).toBe('[0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]');
      verifyRange(0, 255);
    });

    it('matches 1-1000', () => {
      const regex = toRegexRange(1, 1000);
      expect(regex).toBe('[1-9]|[1-9][0-9]|[1-9][0-9][0-9]|1000');
      verifyRange(1, 1000);
    });

    it('matches 10-99', () => {
      expect(toRegexRange(10, 99)).toBe('[1-9][0-9]');
      verifyRange(10, 99);
    });

    it('matches partial two-digit range', () => {
      const regex = toRegexRange(23, 78);
      expect(regex).toBe('2[3-9]|[3-6][0-9]|7[0-8]');
      verifyRange(23, 78);
    });

    it('matches cross-boundary range 99-101', () => {
      verifyRange(99, 101);
    });

    it('matches 100-199', () => {
      expect(toRegexRange(100, 199)).toBe('1[0-9][0-9]');
      verifyRange(100, 199);
    });
  });

  describe('negative ranges', () => {
    it('matches negative-only range', () => {
      const regex = toRegexRange(-5, -1);
      expect(regex).toBe('-(?:[1-5])');
      verifyRange(-5, -1);
    });

    it('matches range crossing zero', () => {
      const regex = toRegexRange(-5, 5);
      expect(regex).toBe('-(?:[1-5])|0|[1-5]');
      verifyRange(-5, 5);
    });

    it('matches negative to zero', () => {
      verifyRange(-3, 0);
    });

    it('matches large negative range', () => {
      verifyRange(-100, -1);
    });
  });

  describe('swapped arguments', () => {
    it('swaps min > max', () => {
      expect(toRegexRange(100, 1)).toBe(toRegexRange(1, 100));
    });
  });

  describe('error handling', () => {
    it('throws for non-finite arguments', () => {
      expect(() => toRegexRange(NaN, 5)).toThrow();
      expect(() => toRegexRange(1, Infinity)).toThrow();
    });
  });

  describe('comprehensive validation', () => {
    const testCases: [number, number][] = [
      [0, 0], [0, 1], [0, 5], [0, 10], [0, 50], [0, 100],
      [1, 10], [1, 50], [1, 99], [5, 15], [10, 50],
      [50, 100], [100, 500], [100, 999],
      [0, 65535], // 16-bit port range
    ];

    for (const [min, max] of testCases) {
      it(`correctly matches range [${min}, ${max}]`, () => {
        verifyRange(min, max);
      });
    }
  });
});

describe('fillRange DoS protection', () => {
  it('throws for ranges exceeding MAX_RANGE_SIZE', () => {
    expect(() => fillRange(0, 100_000_001)).toThrow(/Range too large/);
  });

  it('allows ranges within the limit', () => {
    const result = fillRange(0, 99);
    expect(result).toHaveLength(100);
  });
});
