import { describe, it, expect } from 'vitest';
import { expand, braces } from '../src/braces.js';

// ---------------------------------------------------------------------------
// expand
// ---------------------------------------------------------------------------
describe('expand', () => {
  describe('comma-separated', () => {
    it('expands simple comma list', () => {
      expect(expand('{a,b,c}')).toEqual(['a', 'b', 'c']);
    });

    it('expands two items', () => {
      expect(expand('{x,y}')).toEqual(['x', 'y']);
    });

    it('expands with prefix', () => {
      expect(expand('pre{a,b}')).toEqual(['prea', 'preb']);
    });

    it('expands with suffix', () => {
      expect(expand('{a,b}suf')).toEqual(['asuf', 'bsuf']);
    });

    it('expands with prefix and suffix', () => {
      expect(expand('foo/{a,b}/bar')).toEqual(['foo/a/bar', 'foo/b/bar']);
    });

    it('expands multiple brace groups', () => {
      expect(expand('x{a,b}y{1,2}z')).toEqual([
        'xay1z', 'xay2z', 'xby1z', 'xby2z',
      ]);
    });

    it('expands empty alternatives', () => {
      expect(expand('{,}')).toEqual(['', '']);
    });

    it('expands with one empty alternative', () => {
      expect(expand('a{,b}c')).toEqual(['ac', 'abc']);
    });
  });

  describe('numeric ranges', () => {
    it('expands ascending numeric range', () => {
      expect(expand('{1..5}')).toEqual(['1', '2', '3', '4', '5']);
    });

    it('expands descending numeric range', () => {
      expect(expand('{5..1}')).toEqual(['5', '4', '3', '2', '1']);
    });

    it('expands range with step', () => {
      expect(expand('{1..10..2}')).toEqual(['1', '3', '5', '7', '9']);
    });

    it('expands zero-padded range', () => {
      expect(expand('{01..05}')).toEqual(['01', '02', '03', '04', '05']);
    });

    it('expands range with prefix/suffix', () => {
      expect(expand('file{1..3}.txt')).toEqual([
        'file1.txt', 'file2.txt', 'file3.txt',
      ]);
    });

    it('expands range starting from zero', () => {
      expect(expand('{0..3}')).toEqual(['0', '1', '2', '3']);
    });
  });

  describe('letter ranges', () => {
    it('expands ascending letter range', () => {
      expect(expand('{a..e}')).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('expands descending letter range', () => {
      expect(expand('{e..a}')).toEqual(['e', 'd', 'c', 'b', 'a']);
    });

    it('expands uppercase letter range', () => {
      expect(expand('{A..E}')).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('expands letter range with step', () => {
      expect(expand('{a..j..2}')).toEqual(['a', 'c', 'e', 'g', 'i']);
    });
  });

  describe('nested braces', () => {
    it('expands nested comma with range', () => {
      expect(expand('{a,b{1..3}}')).toEqual(['a', 'b1', 'b2', 'b3']);
    });

    it('expands nested comma in comma', () => {
      expect(expand('{a,{b,c}}')).toEqual(['a', 'b', 'c']);
    });

    it('expands double-wrapped braces', () => {
      expect(expand('{{a,b}}')).toEqual(['a', 'b']);
    });

    it('expands complex nesting', () => {
      expect(expand('{a{1,2},b{3,4}}')).toEqual(['a1', 'a2', 'b3', 'b4']);
    });
  });

  describe('non-expansion cases', () => {
    it('returns plain string without braces', () => {
      expect(expand('no-braces')).toEqual(['no-braces']);
    });

    it('keeps single-element braces literal', () => {
      expect(expand('{a}')).toEqual(['{a}']);
    });

    it('keeps unmatched braces literal', () => {
      expect(expand('{a')).toEqual(['{a']);
    });

    it('keeps non-range/non-comma content literal', () => {
      expect(expand('{foo}')).toEqual(['{foo}']);
    });
  });

  describe('ReDoS protection', () => {
    it('throws on deeply nested patterns', () => {
      const deep = '{'.repeat(15) + 'a,b' + '}'.repeat(15);
      expect(() => expand(deep)).toThrow(/maximum nesting depth/);
    });

    it('throws on combinatorial explosion', () => {
      expect(() => expand('{1..500}{1..500}')).toThrow(
        /maximum output count/
      );
    });

    it('allows normal-depth patterns', () => {
      expect(() => expand('{a,{b,{c,d}}}')).not.toThrow();
    });

    it('allows reasonable expansion size', () => {
      // 26 * 26 = 676 — well under 10K limit
      expect(() => expand('{a..z}{a..z}')).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('handles escaped braces', () => {
      expect(expand('\\{a,b\\}')).toEqual(['\\{a,b\\}']);
    });

    it('handles empty string', () => {
      expect(expand('')).toEqual(['']);
    });

    it('handles adjacent brace groups', () => {
      expect(expand('{a,b}{1,2}')).toEqual(['a1', 'a2', 'b1', 'b2']);
    });
  });
});

// ---------------------------------------------------------------------------
// braces (regex mode)
// ---------------------------------------------------------------------------
describe('braces', () => {
  it('converts comma list to alternation', () => {
    expect(braces('{a,b,c}')).toBe('(a|b|c)');
  });

  it('converts numeric range to regex', () => {
    expect(braces('{1..5}')).toBe('([1-5])');
  });

  it('converts letter range to character class', () => {
    expect(braces('{a..e}')).toBe('([a-e])');
  });

  it('preserves prefix and suffix', () => {
    expect(braces('*.{js,ts}')).toBe('*.(js|ts)');
  });

  it('handles nested braces', () => {
    expect(braces('{src,lib}/**/*.{js,ts}')).toBe(
      '(src|lib)/**/*.(js|ts)'
    );
  });

  it('keeps single-element braces literal', () => {
    expect(braces('{a}')).toBe('{a}');
  });

  it('passes through plain string', () => {
    expect(braces('no-braces')).toBe('no-braces');
  });

  it('converts reversed letter range', () => {
    // {e..a} reversed → [a-e]
    expect(braces('{e..a}')).toBe('([a-e])');
  });

  it('converts multi-digit numeric range', () => {
    const result = braces('{1..100}');
    expect(result).toBe('([1-9]|[1-9][0-9]|100)');
  });

  describe('ReDoS protection', () => {
    it('throws on deeply nested patterns in regex mode', () => {
      const deep = '{'.repeat(15) + 'a,b' + '}'.repeat(15);
      expect(() => braces(deep)).toThrow(/maximum nesting depth/);
    });
  });
});
