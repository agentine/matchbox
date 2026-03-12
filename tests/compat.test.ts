import { describe, it, expect } from 'vitest';
import { isMatch, match, makeRe, not, some, every, filter, scan } from '../src/index.js';
import matchbox from '../src/index.js';

// ---------------------------------------------------------------------------
// isMatch
// ---------------------------------------------------------------------------

describe('isMatch', () => {
  it('should match a single glob pattern', () => {
    expect(isMatch('foo.js', '*.js')).toBe(true);
    expect(isMatch('foo.ts', '*.js')).toBe(false);
  });

  it('should match with array of patterns (OR logic)', () => {
    expect(isMatch('foo.js', ['*.js', '*.ts'])).toBe(true);
    expect(isMatch('foo.ts', ['*.js', '*.ts'])).toBe(true);
    expect(isMatch('foo.py', ['*.js', '*.ts'])).toBe(false);
  });

  it('should handle negation in pattern array', () => {
    // Match all JS except test files
    expect(isMatch('app.js', ['*.js', '!test.*'])).toBe(true);
    expect(isMatch('test.js', ['*.js', '!test.*'])).toBe(false);
  });

  it('should handle mixed include + exclude patterns', () => {
    expect(isMatch('src/app.js', ['**/*.js', '!test/**'])).toBe(true);
    expect(isMatch('test/app.js', ['**/*.js', '!test/**'])).toBe(false);
  });

  it('should handle all-negation array (exclude-only)', () => {
    // Only negation patterns → everything matches except excluded
    expect(isMatch('foo.js', ['!*.ts'])).toBe(true);
    expect(isMatch('foo.ts', ['!*.ts'])).toBe(false);
  });

  it('should handle double-negation !! in pattern arrays (#138)', () => {
    // !!*.ts cancels out to an include for *.ts
    expect(isMatch('foo.js', ['*.js', '!!*.ts'])).toBe(true);
    expect(isMatch('foo.ts', ['*.js', '!!*.ts'])).toBe(true);
    // Without the *.js include, !!*.ts alone still acts as include
    expect(isMatch('foo.ts', ['!!*.ts'])).toBe(true);
    expect(isMatch('foo.js', ['!!*.ts'])).toBe(false);
  });

  it('should handle triple-negation !!! in pattern arrays (#138)', () => {
    // !!!*.ts = odd count, so it is an exclude for *.ts
    expect(isMatch('foo.js', ['*.js', '!!!*.ts'])).toBe(true);
    expect(isMatch('foo.ts', ['*.js', '!!!*.ts'])).toBe(false);
  });

  it('should handle quadruple-negation !!!! in pattern arrays (#138)', () => {
    // !!!!*.ts = even count, so it is an include for *.ts
    expect(isMatch('foo.ts', ['!!!!*.ts'])).toBe(true);
    expect(isMatch('foo.js', ['!!!!*.ts'])).toBe(false);
  });

  it('should match globstar', () => {
    expect(isMatch('src/a/b/c.js', '**/*.js')).toBe(true);
    expect(isMatch('c.js', '**/*.js')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// match
// ---------------------------------------------------------------------------

describe('match', () => {
  const files = ['app.js', 'app.ts', 'test.js', 'lib.py'];

  it('should filter with single pattern', () => {
    expect(match(files, '*.js')).toEqual(['app.js', 'test.js']);
  });

  it('should filter with pattern array including negation', () => {
    expect(match(files, ['*.js', '!test.*'])).toEqual(['app.js']);
  });

  it('should return empty for no matches', () => {
    expect(match(files, '*.rb')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// makeRe
// ---------------------------------------------------------------------------

describe('makeRe', () => {
  it('should compile a glob to a RegExp', () => {
    const re = makeRe('*.js');
    expect(re).toBeInstanceOf(RegExp);
    expect(re.test('foo.js')).toBe(true);
    expect(re.test('foo.ts')).toBe(false);
  });

  it('should support nocase option', () => {
    const re = makeRe('*.JS', { nocase: true });
    expect(re.test('foo.js')).toBe(true);
    expect(re.test('foo.JS')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// not
// ---------------------------------------------------------------------------

describe('not', () => {
  const files = ['app.js', 'app.ts', 'test.js', 'lib.py'];

  it('should return items that do NOT match', () => {
    expect(not(files, '*.js')).toEqual(['app.ts', 'lib.py']);
  });

  it('should work with pattern array', () => {
    expect(not(files, ['*.js', '*.ts'])).toEqual(['lib.py']);
  });
});

// ---------------------------------------------------------------------------
// some
// ---------------------------------------------------------------------------

describe('some', () => {
  const files = ['app.js', 'app.ts'];

  it('should return true if any string matches', () => {
    expect(some(files, '*.js')).toBe(true);
  });

  it('should return false if no string matches', () => {
    expect(some(files, '*.py')).toBe(false);
  });

  it('should work with pattern arrays', () => {
    expect(some(['foo.py', 'bar.rb'], ['*.js', '*.ts'])).toBe(false);
    expect(some(['foo.py', 'bar.js'], ['*.js', '*.ts'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// every
// ---------------------------------------------------------------------------

describe('every', () => {
  it('should return true when all match', () => {
    expect(every(['a.js', 'b.js'], '*.js')).toBe(true);
  });

  it('should return false when not all match', () => {
    expect(every(['a.js', 'b.ts'], '*.js')).toBe(false);
  });

  it('should work with pattern arrays', () => {
    expect(every(['a.js', 'b.ts'], ['*.js', '*.ts'])).toBe(true);
    expect(every(['a.js', 'b.py'], ['*.js', '*.ts'])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filter
// ---------------------------------------------------------------------------

describe('filter', () => {
  it('should return a predicate function', () => {
    const fn = filter('*.js');
    expect(typeof fn).toBe('function');
    expect(fn('foo.js')).toBe(true);
    expect(fn('foo.ts')).toBe(false);
  });

  it('should work with pattern arrays', () => {
    const fn = filter(['*.js', '!test.*']);
    expect(fn('app.js')).toBe(true);
    expect(fn('test.js')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Options: dot, nocase, contains
// ---------------------------------------------------------------------------

describe('options', () => {
  it('dot: false (default) should not match dotfiles', () => {
    expect(isMatch('.hidden', '*')).toBe(false);
    expect(isMatch('.hidden', '.*')).toBe(true);
  });

  it('dot: true should match dotfiles', () => {
    expect(isMatch('.hidden', '*', { dot: true })).toBe(true);
  });

  it('nocase should enable case-insensitive matching', () => {
    expect(isMatch('FOO.JS', '*.js', { nocase: true })).toBe(true);
    expect(isMatch('FOO.JS', '*.js')).toBe(false);
  });

  it('contains should match anywhere in the string', () => {
    expect(isMatch('path/to/file.js', '*.js', { contains: true })).toBe(true);
    expect(isMatch('path/to/file.js', '*.js')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('empty list should return empty', () => {
    expect(match([], '*.js')).toEqual([]);
  });

  it('empty pattern should not match anything', () => {
    expect(isMatch('foo', '')).toBe(false);
  });

  it('empty pattern array should not match anything', () => {
    expect(isMatch('foo', [])).toBe(false);
  });

  it('some on empty list returns false', () => {
    expect(some([], '*.js')).toBe(false);
  });

  it('every on empty list returns true (vacuous truth)', () => {
    expect(every([], '*.js')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// scan (re-exported)
// ---------------------------------------------------------------------------

describe('scan (re-export)', () => {
  it('should parse a glob pattern', () => {
    const result = scan('src/**/*.js');
    expect(result.base).toBe('src');
    expect(result.isGlob).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

describe('default export', () => {
  it('should contain all API functions', () => {
    expect(typeof matchbox.isMatch).toBe('function');
    expect(typeof matchbox.match).toBe('function');
    expect(typeof matchbox.makeRe).toBe('function');
    expect(typeof matchbox.not).toBe('function');
    expect(typeof matchbox.some).toBe('function');
    expect(typeof matchbox.every).toBe('function');
    expect(typeof matchbox.filter).toBe('function');
    expect(typeof matchbox.scan).toBe('function');
  });
});
