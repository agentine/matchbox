import { describe, it, expect } from 'vitest';
import { scan } from '../src/scan.js';

describe('scan', () => {
  describe('basic glob patterns', () => {
    it('parses pattern with base directory and globstar', () => {
      const result = scan('src/**/*.js');
      expect(result).toEqual({
        base: 'src',
        glob: '**/*.js',
        isGlob: true,
        negated: false,
        prefix: 'src/',
      });
    });

    it('parses simple wildcard pattern', () => {
      const result = scan('*.js');
      expect(result).toEqual({
        base: '.',
        glob: '*.js',
        isGlob: true,
        negated: false,
        prefix: '',
      });
    });

    it('parses globstar only', () => {
      const result = scan('**');
      expect(result).toEqual({
        base: '.',
        glob: '**',
        isGlob: true,
        negated: false,
        prefix: '',
      });
    });

    it('parses deeply nested base path', () => {
      const result = scan('src/lib/utils/**/*.ts');
      expect(result).toEqual({
        base: 'src/lib/utils',
        glob: '**/*.ts',
        isGlob: true,
        negated: false,
        prefix: 'src/lib/utils/',
      });
    });

    it('parses question mark glob', () => {
      const result = scan('src/?.js');
      expect(result).toEqual({
        base: 'src',
        glob: '?.js',
        isGlob: true,
        negated: false,
        prefix: 'src/',
      });
    });
  });

  describe('negation', () => {
    it('parses negated pattern', () => {
      const result = scan('!test/**');
      expect(result).toEqual({
        base: 'test',
        glob: '**',
        isGlob: true,
        negated: true,
        prefix: '!test/',
      });
    });

    it('parses negated pattern without base', () => {
      const result = scan('!*.js');
      expect(result).toEqual({
        base: '.',
        glob: '*.js',
        isGlob: true,
        negated: true,
        prefix: '!',
      });
    });
  });

  describe('non-glob patterns', () => {
    it('identifies non-glob literal path', () => {
      const result = scan('foo.js');
      expect(result).toEqual({
        base: '.',
        glob: 'foo.js',
        isGlob: false,
        negated: false,
        prefix: '',
      });
    });

    it('identifies non-glob path with directory', () => {
      const result = scan('src/foo.js');
      expect(result).toEqual({
        base: '.',
        glob: 'src/foo.js',
        isGlob: false,
        negated: false,
        prefix: '',
      });
    });

    it('handles empty string', () => {
      const result = scan('');
      expect(result).toEqual({
        base: '.',
        glob: '',
        isGlob: false,
        negated: false,
        prefix: '',
      });
    });
  });

  describe('brace expansion', () => {
    it('detects brace expansion with commas', () => {
      const result = scan('src/**/*.{js,ts}');
      expect(result).toEqual({
        base: 'src',
        glob: '**/*.{js,ts}',
        isGlob: true,
        negated: false,
        prefix: 'src/',
      });
    });

    it('detects brace expansion with range', () => {
      const result = scan('file{1..5}.txt');
      expect(result).toEqual({
        base: '.',
        glob: 'file{1..5}.txt',
        isGlob: true,
        negated: false,
        prefix: '',
      });
    });

    it('does not treat non-expansion braces as glob', () => {
      const result = scan('src/{foo}.js');
      expect(result).toEqual({
        base: '.',
        glob: 'src/{foo}.js',
        isGlob: false,
        negated: false,
        prefix: '',
      });
    });
  });

  describe('character classes', () => {
    it('detects character class as glob', () => {
      const result = scan('src/[abc].js');
      expect(result).toEqual({
        base: 'src',
        glob: '[abc].js',
        isGlob: true,
        negated: false,
        prefix: 'src/',
      });
    });
  });

  describe('extglobs', () => {
    it('detects extglob !(pattern)', () => {
      const result = scan('src/!(test)/*.js');
      expect(result).toEqual({
        base: 'src',
        glob: '!(test)/*.js',
        isGlob: true,
        negated: false,
        prefix: 'src/',
      });
    });

    it('detects extglob +(pattern)', () => {
      const result = scan('*.+(js|ts)');
      expect(result).toEqual({
        base: '.',
        glob: '*.+(js|ts)',
        isGlob: true,
        negated: false,
        prefix: '',
      });
    });
  });

  describe('escaped characters', () => {
    it('ignores escaped glob characters', () => {
      const result = scan('src/\\*.js');
      expect(result).toEqual({
        base: '.',
        glob: 'src/\\*.js',
        isGlob: false,
        negated: false,
        prefix: '',
      });
    });
  });

  describe('edge cases', () => {
    it('handles pattern starting with glob', () => {
      const result = scan('**/foo.js');
      expect(result).toEqual({
        base: '.',
        glob: '**/foo.js',
        isGlob: true,
        negated: false,
        prefix: '',
      });
    });

    it('handles multiple directories in base', () => {
      const result = scan('a/b/c/*.js');
      expect(result).toEqual({
        base: 'a/b/c',
        glob: '*.js',
        isGlob: true,
        negated: false,
        prefix: 'a/b/c/',
      });
    });
  });
});
