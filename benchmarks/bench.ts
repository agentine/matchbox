/**
 * Performance benchmarks for matchbox.
 *
 * Run: npx tsx benchmarks/bench.ts
 */

import { isMatch, match, makeRe } from '../src/index.js';
import { expand } from '../src/braces.js';
import { fillRange, toRegexRange } from '../src/range.js';
import { globRe } from '../src/glob.js';
import { scan } from '../src/scan.js';

function bench(name: string, fn: () => void, iterations = 100_000): void {
  // Warmup
  for (let i = 0; i < 1000; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;

  const opsPerSec = Math.round((iterations / elapsed) * 1000);
  const usPerOp = (elapsed / iterations * 1000).toFixed(2);
  console.log(`  ${name}: ${opsPerSec.toLocaleString()} ops/s (${usPerOp} µs/op)`);
}

// ─── Test data ───────────────────────────────────────────────────────

const paths = [
  'src/index.ts',
  'src/components/Button.tsx',
  'src/utils/format.ts',
  'tests/unit/math.test.ts',
  'node_modules/lodash/index.js',
  '.gitignore',
  'docs/api/README.md',
  'build/output/bundle.js',
  'src/deeply/nested/path/to/file.ts',
  'package.json',
];

// ─── Benchmarks ──────────────────────────────────────────────────────

console.log('\n=== Glob Matching ===');

bench('Simple wildcard (*.ts)', () => {
  isMatch('src/index.ts', '*.ts');
});

bench('Double star (**/*.ts)', () => {
  isMatch('src/components/Button.tsx', '**/*.ts');
});

bench('Complex pattern (**/*.{ts,tsx})', () => {
  isMatch('src/components/Button.tsx', '**/*.{ts,tsx}');
});

bench('Negation (!*.js)', () => {
  isMatch('index.ts', '!*.js');
});

bench('Character class ([a-z]*.ts)', () => {
  isMatch('index.ts', '[a-z]*.ts');
});

bench('Extglob (+(a|b).ts)', () => {
  isMatch('ab.ts', '+(a|b).ts');
});

console.log('\n=== Array Filtering ===');

bench('match(10 paths, **/*.ts)', () => {
  match(paths, '**/*.ts');
});

bench('match(10 paths, [**/*.ts, !**/test*])', () => {
  match(paths, ['**/*.ts', '!**/test*']);
});

console.log('\n=== RegExp Compilation ===');

bench('makeRe(**/*.ts)', () => {
  makeRe('**/*.ts');
});

bench('globRe(**/*.{js,ts,tsx})', () => {
  globRe('**/*.{js,ts,tsx}');
});

console.log('\n=== Brace Expansion ===');

bench('expand({a,b,c})', () => {
  expand('{a,b,c}');
});

bench('expand({1..10})', () => {
  expand('{1..10}');
});

bench('expand({a,b}{1..5})', () => {
  expand('{a,b}{1..5}');
});

console.log('\n=== Range Operations ===');

bench('fillRange(1, 100)', () => {
  fillRange(1, 100);
});

bench('toRegexRange(1, 999)', () => {
  toRegexRange(1, 999);
});

console.log('\n=== Pattern Scanning ===');

bench('scan(src/**/*.ts)', () => {
  scan('src/**/*.ts');
});

bench('scan(!src/vendor/**)', () => {
  scan('!src/vendor/**');
});

console.log('\n=== Pre-compiled Matching ===');

const compiled = makeRe('**/*.{ts,tsx}');
bench('Pre-compiled regex test', () => {
  compiled.test('src/components/Button.tsx');
});

console.log('');
