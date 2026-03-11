import { describe, it, expect } from 'vitest';
import { globMatch, globRe, isMatch } from '../src/glob.js';

describe('isMatch', () => {
  describe('star — match any chars except /', () => {
    it('matches any filename', () => {
      expect(isMatch('foo.js', '*.js')).toBe(true);
      expect(isMatch('bar.js', '*.js')).toBe(true);
    });

    it('does not match wrong extension', () => {
      expect(isMatch('foo.ts', '*.js')).toBe(false);
    });

    it('does not match across path separators', () => {
      expect(isMatch('src/foo.js', '*.js')).toBe(false);
    });

    it('matches with prefix', () => {
      expect(isMatch('file.test.js', 'file.*.js')).toBe(true);
    });

    it('matches empty segment', () => {
      expect(isMatch('.js', '*.js')).toBe(false); // dot file, dot=false
      expect(isMatch('.js', '*.js', { dot: true })).toBe(true);
    });

    it('matches bare star', () => {
      expect(isMatch('foo', '*')).toBe(true);
      expect(isMatch('foo.js', '*')).toBe(true);
      expect(isMatch('a/b', '*')).toBe(false);
    });
  });

  describe('globstar — ** matches any including /', () => {
    it('matches nested paths', () => {
      expect(isMatch('src/foo/bar.js', '**/*.js')).toBe(true);
      expect(isMatch('foo.js', '**/*.js')).toBe(true);
      expect(isMatch('a/b/c/d.js', '**/*.js')).toBe(true);
    });

    it('does not match wrong extension with globstar', () => {
      expect(isMatch('src/foo.ts', '**/*.js')).toBe(false);
    });

    it('matches with leading directory', () => {
      expect(isMatch('src/lib/utils/index.ts', 'src/**/*.ts')).toBe(true);
      expect(isMatch('lib/index.ts', 'src/**/*.ts')).toBe(false);
    });

    it('matches everything with bare **', () => {
      expect(isMatch('foo', '**')).toBe(true);
      expect(isMatch('foo/bar', '**')).toBe(true);
      expect(isMatch('foo/bar/baz.js', '**')).toBe(true);
    });

    it('matches zero segments', () => {
      expect(isMatch('foo.js', '**/*.js')).toBe(true);
    });

    it('matches specific structure with globstar in middle', () => {
      expect(isMatch('src/a/b/index.js', 'src/**/index.js')).toBe(true);
      expect(isMatch('src/index.js', 'src/**/index.js')).toBe(true);
    });
  });

  describe('question mark — single char except /', () => {
    it('matches single character', () => {
      expect(isMatch('a.js', '?.js')).toBe(true);
      expect(isMatch('b.js', '?.js')).toBe(true);
    });

    it('does not match zero characters', () => {
      expect(isMatch('.js', '?.js')).toBe(false);
    });

    it('does not match multiple characters', () => {
      expect(isMatch('ab.js', '?.js')).toBe(false);
    });

    it('does not match path separator', () => {
      expect(isMatch('/.js', '?.js')).toBe(false);
    });
  });

  describe('character classes', () => {
    it('matches character in class', () => {
      expect(isMatch('a.js', '[abc].js')).toBe(true);
      expect(isMatch('b.js', '[abc].js')).toBe(true);
      expect(isMatch('c.js', '[abc].js')).toBe(true);
    });

    it('does not match character not in class', () => {
      expect(isMatch('d.js', '[abc].js')).toBe(false);
    });

    it('matches character range', () => {
      expect(isMatch('f.js', '[a-z].js')).toBe(true);
      expect(isMatch('A.js', '[a-z].js')).toBe(false);
    });

    it('matches negated class with !', () => {
      expect(isMatch('d.js', '[!abc].js')).toBe(true);
      expect(isMatch('a.js', '[!abc].js')).toBe(false);
    });

    it('matches negated class with ^', () => {
      expect(isMatch('d.js', '[^abc].js')).toBe(true);
      expect(isMatch('b.js', '[^abc].js')).toBe(false);
    });

    it('matches ] as first char in character class', () => {
      // []] matches literal ]
      expect(isMatch(']', '[]]')).toBe(true);
      expect(isMatch('a', '[]]')).toBe(false);
      // [!]] matches anything except ]
      expect(isMatch('a', '[!]]')).toBe(true);
      expect(isMatch(']', '[!]]')).toBe(false);
      // []a] matches ] or a
      expect(isMatch(']', '[]a]')).toBe(true);
      expect(isMatch('a', '[]a]')).toBe(true);
      expect(isMatch('b', '[]a]')).toBe(false);
    });
  });

  describe('POSIX character classes', () => {
    it('matches [:alpha:]', () => {
      expect(isMatch('a', '[[:alpha:]]')).toBe(true);
      expect(isMatch('Z', '[[:alpha:]]')).toBe(true);
      expect(isMatch('1', '[[:alpha:]]')).toBe(false);
    });

    it('matches [:digit:]', () => {
      expect(isMatch('5', '[[:digit:]]')).toBe(true);
      expect(isMatch('a', '[[:digit:]]')).toBe(false);
    });

    it('matches [:alnum:]', () => {
      expect(isMatch('a', '[[:alnum:]]')).toBe(true);
      expect(isMatch('5', '[[:alnum:]]')).toBe(true);
      expect(isMatch('!', '[[:alnum:]]')).toBe(false);
    });

    it('matches [:upper:]', () => {
      expect(isMatch('A', '[[:upper:]]')).toBe(true);
      expect(isMatch('a', '[[:upper:]]')).toBe(false);
    });

    it('matches [:lower:]', () => {
      expect(isMatch('a', '[[:lower:]]')).toBe(true);
      expect(isMatch('A', '[[:lower:]]')).toBe(false);
    });

    it('matches [:xdigit:]', () => {
      expect(isMatch('f', '[[:xdigit:]]')).toBe(true);
      expect(isMatch('F', '[[:xdigit:]]')).toBe(true);
      expect(isMatch('9', '[[:xdigit:]]')).toBe(true);
      expect(isMatch('g', '[[:xdigit:]]')).toBe(false);
    });
  });

  describe('brace expansion', () => {
    it('matches comma-separated alternatives', () => {
      expect(isMatch('foo.js', '*.{js,ts}')).toBe(true);
      expect(isMatch('foo.ts', '*.{js,ts}')).toBe(true);
      expect(isMatch('foo.css', '*.{js,ts}')).toBe(false);
    });

    it('matches range expansion', () => {
      expect(isMatch('file1.txt', 'file{1..5}.txt')).toBe(true);
      expect(isMatch('file3.txt', 'file{1..5}.txt')).toBe(true);
      expect(isMatch('file5.txt', 'file{1..5}.txt')).toBe(true);
      expect(isMatch('file6.txt', 'file{1..5}.txt')).toBe(false);
    });

    it('matches nested brace expansion', () => {
      expect(isMatch('src/index.ts', '{src,lib}/**')).toBe(true);
      expect(isMatch('lib/utils.js', '{src,lib}/**')).toBe(true);
      expect(isMatch('test/foo.ts', '{src,lib}/**')).toBe(false);
    });
  });

  describe('extglobs', () => {
    it('matches @(pat) — exactly one', () => {
      expect(isMatch('foo.js', '*.@(js|ts)')).toBe(true);
      expect(isMatch('foo.ts', '*.@(js|ts)')).toBe(true);
      expect(isMatch('foo.css', '*.@(js|ts)')).toBe(false);
    });

    it('matches +(pat) — one or more', () => {
      expect(isMatch('foo.js', '*.+(js|ts)')).toBe(true);
      expect(isMatch('foo.ts', '*.+(js|ts)')).toBe(true);
      expect(isMatch('foo.jsts', '*.+(js|ts)')).toBe(true);
      expect(isMatch('foo.css', '*.+(js|ts)')).toBe(false);
    });

    it('matches ?(pat) — zero or one', () => {
      expect(isMatch('foo.js', 'foo.?(js)')).toBe(true);
      expect(isMatch('foo.', 'foo.?(js)')).toBe(true);
      expect(isMatch('foo.jss', 'foo.?(js)')).toBe(false);
    });

    it('matches *(pat) — zero or more', () => {
      expect(isMatch('foo', 'foo*(bar)')).toBe(true);
      expect(isMatch('foobar', 'foo*(bar)')).toBe(true);
      expect(isMatch('foobarbar', 'foo*(bar)')).toBe(true);
    });

    it('matches !(pat) — negation extglob', () => {
      expect(isMatch('foo.js', '*.!(ts)')).toBe(true);
      expect(isMatch('foo.css', '*.!(ts)')).toBe(true);
      // !(ts) should not match "ts"
      expect(isMatch('foo.ts', '*.!(ts)')).toBe(false);
    });

    it('!(pat) rejects exact match only, not substring match', () => {
      // tsx != ts, so !(ts) should match tsx
      expect(isMatch('foo.tsx', '*.!(ts)')).toBe(true);
      expect(isMatch('foo.tss', '*.!(ts)')).toBe(true);
      // ts == ts, so !(ts) should NOT match
      expect(isMatch('foo.ts', '*.!(ts)')).toBe(false);
      // multi-alt negation
      expect(isMatch('foo.py', '*.!(js|ts)')).toBe(true);
      expect(isMatch('foo.js', '*.!(js|ts)')).toBe(false);
      expect(isMatch('foo.ts', '*.!(js|ts)')).toBe(false);
      expect(isMatch('foo.jsx', '*.!(js|ts)')).toBe(true);
    });

    it('nested extglobs do not cause ReDoS', () => {
      const start = Date.now();
      globRe('+(+(a))').test('a'.repeat(25) + 'X');
      expect(Date.now() - start).toBeLessThan(100);
    });

    it('triple nested extglobs do not cause ReDoS', () => {
      const start = Date.now();
      globRe('+(+(+(a)))').test('a'.repeat(30) + 'X');
      expect(Date.now() - start).toBeLessThan(100);
    });

    it('nested extglobs still match correctly', () => {
      expect(isMatch('aaa', '+(+(a))')).toBe(true);
      expect(isMatch('a', '+(+(a))')).toBe(true);
      expect(isMatch('', '+(+(a))')).toBe(false);
      expect(isMatch('b', '+(+(a))')).toBe(false);
    });
  });

  describe('negation prefix !', () => {
    it('negates the entire pattern', () => {
      expect(isMatch('foo.js', '!*.ts')).toBe(true);
      expect(isMatch('foo.ts', '!*.ts')).toBe(false);
    });

    it('negates complex patterns', () => {
      expect(isMatch('test/foo.js', '!test/**')).toBe(false);
      expect(isMatch('src/foo.js', '!test/**')).toBe(true);
    });
  });

  describe('backslash escape', () => {
    it('escapes glob characters', () => {
      expect(isMatch('*.js', '\\*.js')).toBe(true);
      expect(isMatch('foo.js', '\\*.js')).toBe(false);
    });

    it('escapes question mark', () => {
      expect(isMatch('?.js', '\\?.js')).toBe(true);
      expect(isMatch('a.js', '\\?.js')).toBe(false);
    });
  });

  describe('dot files', () => {
    it('hides dotfiles by default', () => {
      expect(isMatch('.gitignore', '*')).toBe(false);
      expect(isMatch('.env', '*')).toBe(false);
    });

    it('matches dotfiles with dot option', () => {
      expect(isMatch('.gitignore', '*', { dot: true })).toBe(true);
      expect(isMatch('.env', '*', { dot: true })).toBe(true);
    });

    it('matches explicit dot in pattern', () => {
      expect(isMatch('.gitignore', '.gitignore')).toBe(true);
      expect(isMatch('.gitignore', '.*')).toBe(true);
    });

    it('hides nested dotfiles by default', () => {
      expect(isMatch('src/.env', 'src/*')).toBe(false);
      expect(isMatch('src/.env', 'src/*', { dot: true })).toBe(true);
    });

    it('hides dotfiles in globstar by default', () => {
      expect(isMatch('.hidden/foo.js', '**/*.js')).toBe(false);
      expect(isMatch('.hidden/foo.js', '**/*.js', { dot: true })).toBe(true);
    });
  });

  describe('nocase option', () => {
    it('matches case-insensitively', () => {
      expect(isMatch('FOO.JS', '*.js', { nocase: true })).toBe(true);
      expect(isMatch('foo.JS', '*.js', { nocase: true })).toBe(true);
    });

    it('is case-sensitive by default', () => {
      expect(isMatch('FOO.JS', '*.js')).toBe(false);
    });
  });

  describe('contains option', () => {
    it('matches anywhere in string', () => {
      expect(isMatch('path/to/foo.js', '*.js', { contains: true })).toBe(true);
    });
  });

  describe('literal patterns', () => {
    it('matches exact strings', () => {
      expect(isMatch('foo.js', 'foo.js')).toBe(true);
      expect(isMatch('bar.js', 'foo.js')).toBe(false);
    });

    it('matches paths with directories', () => {
      expect(isMatch('src/foo.js', 'src/foo.js')).toBe(true);
    });

    it('escapes literal | (not regex alternation)', () => {
      expect(isMatch('a|b', 'a|b')).toBe(true);
      expect(isMatch('a', 'a|b')).toBe(false);
      expect(isMatch('b', 'a|b')).toBe(false);
    });

    it('escapes literal ( ) (not regex groups)', () => {
      expect(isMatch('(foo)', '(foo)')).toBe(true);
      expect(isMatch('foo', '(foo)')).toBe(false);
    });

    it('brace expansion still produces alternation', () => {
      expect(isMatch('foo.js', '*.{js,ts}')).toBe(true);
      expect(isMatch('foo.ts', '*.{js,ts}')).toBe(true);
      expect(isMatch('foo.css', '*.{js,ts}')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty pattern', () => {
      expect(isMatch('', '')).toBe(true);
      expect(isMatch('foo', '')).toBe(false);
    });

    it('handles empty input', () => {
      expect(isMatch('', '*')).toBe(true); // * matches empty string
      expect(isMatch('', '?')).toBe(false); // ? requires exactly one char
    });

    it('handles pattern with only path separators', () => {
      expect(isMatch('/', '/')).toBe(true);
    });

    it('handles complex combined patterns', () => {
      expect(isMatch('src/utils/index.test.ts', 'src/**/*.test.{js,ts}')).toBe(true);
      expect(isMatch('src/index.test.js', 'src/**/*.test.{js,ts}')).toBe(true);
      expect(isMatch('src/index.test.css', 'src/**/*.test.{js,ts}')).toBe(false);
    });
  });
});

describe('globMatch', () => {
  it('returns a reusable matcher function', () => {
    const match = globMatch('**/*.js');
    expect(match('foo.js')).toBe(true);
    expect(match('src/bar.js')).toBe(true);
    expect(match('foo.ts')).toBe(false);
  });
});

describe('globRe', () => {
  it('returns a RegExp', () => {
    const re = globRe('*.js');
    expect(re).toBeInstanceOf(RegExp);
    expect(re.test('foo.js')).toBe(true);
    expect(re.test('foo.ts')).toBe(false);
  });

  it('returns NegatedRegExp for ! patterns', () => {
    const re = globRe('!*.ts');
    expect(re.test('foo.js')).toBe(true);
    expect(re.test('foo.ts')).toBe(false);
  });

  it('supports nocase flag', () => {
    const re = globRe('*.js', { nocase: true });
    expect(re.test('FOO.JS')).toBe(true);
  });
});
