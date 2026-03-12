# @agentine/matchbox

A zero-dependency, consolidated glob matching library that replaces the fragmented micromatch ecosystem.

## Why matchbox?

The micromatch ecosystem spans six interdependent packages — micromatch, picomatch, braces, fill-range, to-regex-range, and is-number — all maintained by a single individual, with known ReDoS vulnerabilities and a history of slow security response. matchbox collapses all six into one auditable, TypeScript-first package with no runtime dependencies.

| Replaces | Weekly Downloads | Function |
|----------|-----------------|----------|
| `micromatch` | ~64M | Extended glob matching |
| `picomatch` | ~134M | Core glob pattern matching |
| `braces` | ~41M | Brace expansion |
| `fill-range` | ~65M | Numeric and alphabetic range filling |
| `to-regex-range` | ~65M | Number ranges to optimized regex |
| `is-number` | ~59M | Numeric value checking |

Key properties:

- **Zero dependencies** — eliminates transitive supply-chain risk
- **TypeScript-first** — full type exports, no separate `@types` package needed
- **ESM only** — modern default, tree-shakeable subpath exports
- **micromatch-compatible API** — drop-in replacement for the most common patterns
- **ReDoS protection built-in** — brace expansion enforces max depth (10) and max expansion count (10,000), mitigating CVE-2024-4068-style attacks by design

## Installation

```sh
npm install @agentine/matchbox
```

## Quick Start

```typescript
import { isMatch, match, makeRe, not } from '@agentine/matchbox';

// Test whether a string matches a glob pattern
isMatch('src/index.ts', '**/*.ts');            // true
isMatch('dist/index.js', '**/*.ts');           // false

// Filter an array
match(['a.js', 'b.ts', 'c.js'], '*.js');      // ['a.js', 'c.js']

// Exclude with negation patterns
match(['a.js', 'test/a.js'], ['**/*.js', '!test/**']); // ['a.js']

// Compile a glob to RegExp
const re = makeRe('src/**/*.{js,ts}');
re.test('src/utils/helper.ts');               // true
```

---

## API Reference

### Main API — `@agentine/matchbox`

The main entry point provides a micromatch-compatible interface. All functions accept an optional `GlobOptions` object.

```typescript
import { isMatch, match, makeRe, not, some, every, filter, scan } from '@agentine/matchbox';
// or: import matchbox from '@agentine/matchbox';
```

---

#### `isMatch(input, patterns, options?)`

Test whether a string matches one or more glob patterns. Returns `boolean`.

When `patterns` is an array, `input` must match at least one non-negated pattern and must not match any negated pattern (patterns starting with `!`). If the array contains only negated patterns, all strings are considered included by default and then exclusions are applied.

```typescript
isMatch('foo/bar.js', '**/*.js');              // true
isMatch('foo/bar.ts', ['*.js', '*.ts']);       // true  (OR logic)
isMatch('foo.js', '!*.ts');                    // true  (negation)
isMatch('test/foo.js', ['**/*.js', '!test/**']); // false (excluded)
```

---

#### `match(list, patterns, options?)`

Filter an array of strings, returning only those that match the given pattern(s). Returns `string[]`.

```typescript
const files = ['a.js', 'b.ts', 'c.md', 'test/d.js'];

match(files, '*.js');                          // ['a.js']
match(files, ['*.js', '*.ts']);                // ['a.js', 'b.ts']
match(files, ['**/*.js', '!test/**']);         // ['a.js']
```

---

#### `makeRe(pattern, options?)`

Compile a glob pattern to a `RegExp`.

```typescript
const re = makeRe('src/**/*.ts');
re.test('src/components/Button.tsx');          // false (tsx != ts)
re.test('src/utils/format.ts');               // true

const reNoCase = makeRe('*.JS', { nocase: true });
reNoCase.test('index.js');                    // true
```

---

#### `not(list, patterns, options?)`

Return items from `list` that do not match the given pattern(s). The inverse of `match`. Returns `string[]`.

```typescript
not(['a.js', 'b.ts', 'c.js'], '*.js');        // ['b.ts']
not(['src/a.ts', 'test/b.ts'], 'test/**');    // ['src/a.ts']
```

---

#### `some(list, patterns, options?)`

Return `true` if any string in the list matches any of the patterns.

```typescript
some(['a.js', 'b.ts'], '*.js');               // true
some(['a.md', 'b.txt'], '*.js');              // false
```

---

#### `every(list, patterns, options?)`

Return `true` if every string in the list matches at least one pattern.

```typescript
every(['a.js', 'b.js'], '*.js');              // true
every(['a.js', 'b.ts'], '*.js');              // false
```

---

#### `filter(patterns, options?)`

Return a filter function `(input: string) => boolean` that tests strings against the pattern(s). Useful for reusing a compiled matcher.

```typescript
const isJs = filter('**/*.js');
['a.js', 'b.ts', 'c.js'].filter(isJs);       // ['a.js', 'c.js']

const isSrc = filter(['src/**', '!src/test/**']);
isSrc('src/index.ts');                        // true
isSrc('src/test/foo.ts');                     // false
```

---

#### `scan(pattern)`

Parse a glob pattern into its component parts. Returns a `ScanResult`. See also the dedicated [`@agentine/matchbox/scan`](#scan-agentinmatchboxscan) subpath.

```typescript
import { scan } from '@agentine/matchbox';

scan('src/**/*.js');
// { base: 'src', glob: '**/*.js', isGlob: true, negated: false, prefix: 'src/' }

scan('!test/**');
// { base: 'test', glob: '**', isGlob: true, negated: true, prefix: '!test/' }
```

---

#### `GlobOptions`

```typescript
interface GlobOptions {
  dot?:      boolean; // Match dotfiles (hidden files starting with .). Default: false.
  nocase?:   boolean; // Case-insensitive matching. Default: false.
  contains?: boolean; // Match anywhere in the string, not just the full path. Default: false.
}
```

---

### Glob — `@agentine/matchbox/glob`

Low-level glob matching functions. This is the picomatch replacement.

```typescript
import { globMatch, globRe, isMatch } from '@agentine/matchbox/glob';
import type { GlobOptions } from '@agentine/matchbox/glob';
```

---

#### `globMatch(pattern, options?)`

Create a reusable matcher function from a glob pattern. Returns `(input: string) => boolean`.

```typescript
const isJs = globMatch('**/*.js');
isJs('src/index.js');     // true
isJs('src/index.ts');     // false

const isDotFile = globMatch('**/.*', { dot: true });
isDotFile('.env');        // true
```

---

#### `globRe(pattern, options?)`

Compile a glob pattern to a `RegExp`.

```typescript
const re = globRe('src/**/*.{js,ts}');
re.test('src/lib/util.ts'); // true
re.test('lib/util.ts');     // false
```

---

#### `isMatch(input, pattern, options?)`

Direct match test: return `true` if `input` matches the glob `pattern`. Unlike the main API's `isMatch`, this function accepts a single pattern string only (no array).

```typescript
import { isMatch } from '@agentine/matchbox/glob';

isMatch('foo.js', '*.js');               // true
isMatch('FOO.JS', '*.js', { nocase: true }); // true
```

---

### Braces — `@agentine/matchbox/braces`

Brace expansion. This is the braces package replacement.

```typescript
import { expand, braces } from '@agentine/matchbox/braces';
```

---

#### `expand(pattern)`

Expand a brace pattern to an array of strings.

```typescript
expand('{a,b,c}');          // ['a', 'b', 'c']
expand('{1..5}');            // ['1', '2', '3', '4', '5']
expand('{a..e}');            // ['a', 'b', 'c', 'd', 'e']
expand('{1..10..2}');        // ['1', '3', '5', '7', '9']  (step)
expand('{01..05}');          // ['01', '02', '03', '04', '05']  (zero-padded)
expand('foo/{a,b}/bar');     // ['foo/a/bar', 'foo/b/bar']
expand('{a,b{1..3}}');       // ['a', 'b1', 'b2', 'b3']  (nested)
```

---

#### `braces(pattern)`

Compile a brace pattern to an optimized regex string. Useful when building regex patterns that include brace expansion.

```typescript
braces('{a,b,c}');          // '(a|b|c)'
braces('{1..5}');            // '([1-5])'
braces('{a..z}');            // '([a-z])'
braces('src/{lib,utils}');  // 'src/(lib|utils)'
```

---

### Range — `@agentine/matchbox/range`

Range filling and regex generation. This is the fill-range, to-regex-range, and is-number replacement.

```typescript
import { fillRange, toRegexRange, isNumber } from '@agentine/matchbox/range';
import type { FillRangeOptions } from '@agentine/matchbox/range';
```

---

#### `fillRange(start, end, step?, options?)`

Fill a range of numbers or letters. Returns `string[]`.

The `step` argument may be passed as the third argument (number) or as part of `options`.

```typescript
fillRange(1, 5);                    // ['1', '2', '3', '4', '5']
fillRange(1, 10, 2);                // ['1', '3', '5', '7', '9']
fillRange('a', 'e');                // ['a', 'b', 'c', 'd', 'e']
fillRange(1, 5, { pad: true });     // ['1', '2', '3', '4', '5']
fillRange('01', '05');              // ['01', '02', '03', '04', '05']  (auto-detected padding)
fillRange(5, 1);                    // ['5', '4', '3', '2', '1']  (descending)
```

Zero-padding is detected automatically from string inputs with leading zeros. Use `{ pad: true }` to force padding to the width of the wider bound.

```typescript
// Custom transform
fillRange(1, 3, {
  transform: (v) => `item-${v}`,
}); // ['item-1', 'item-2', 'item-3']
```

---

#### `toRegexRange(start, end)`

Generate an optimized regex string that matches all integers in the range `[start, end]`. Handles negative numbers, multi-digit ranges, and digit-length boundaries.

```typescript
toRegexRange(1, 5);       // '[1-5]'
toRegexRange(1, 10);      // '[1-9]|10'
toRegexRange(0, 255);     // suitable for matching IP address octets
toRegexRange(-5, 5);      // handles negative range
```

---

#### `isNumber(value)`

Return `true` if `value` is a finite number or a numeric string. Returns `false` for `NaN`, `Infinity`, empty strings, and non-numeric types.

```typescript
isNumber(5);          // true
isNumber('5');        // true
isNumber('3.14');     // true
isNumber(NaN);        // false
isNumber(Infinity);   // false
isNumber('');         // false
isNumber('abc');      // false
```

---

#### `FillRangeOptions`

```typescript
interface FillRangeOptions {
  pad?:       boolean;                             // Pad numbers to equal width.
  transform?: (value: string | number) => string; // Custom value transformer.
}
```

---

### Scan — `@agentine/matchbox/scan`

Pattern scanning and parsing.

```typescript
import { scan } from '@agentine/matchbox/scan';
import type { ScanResult } from '@agentine/matchbox/scan';
```

---

#### `scan(pattern)`

Parse a glob pattern into its component parts. Returns `ScanResult`.

`scan` is useful for filesystem traversal: it extracts the static base directory so you know where to start walking, and the glob portion to pass to a matcher.

```typescript
scan('src/**/*.js');
// {
//   base:    'src',
//   glob:    '**/*.js',
//   isGlob:  true,
//   negated: false,
//   prefix:  'src/'
// }

scan('!test/**');
// {
//   base:    'test',
//   glob:    '**',
//   isGlob:  true,
//   negated: true,
//   prefix:  '!test/'
// }

scan('package.json');
// {
//   base:    '.',
//   glob:    'package.json',
//   isGlob:  false,
//   negated: false,
//   prefix:  ''
// }
```

---

#### `ScanResult`

```typescript
interface ScanResult {
  base:     string;  // Non-glob base directory (e.g., "src" from "src/**/*.js").
  glob:     string;  // Glob portion of the pattern (e.g., "**/*.js").
  isGlob:   boolean; // Whether the pattern contains glob characters.
  negated:  boolean; // Whether the pattern is negated (starts with !).
  prefix:   string;  // The prefix before the glob portion (e.g., "src/").
}
```

---

## Glob Syntax Reference

| Syntax | Description | Example | Matches |
|--------|-------------|---------|---------|
| `*` | Any characters except `/` | `*.js` | `index.js`, `app.js` |
| `**` | Any characters including `/` (globstar) | `src/**/*.ts` | `src/a.ts`, `src/x/y/z.ts` |
| `?` | Single character except `/` | `?.js` | `a.js`, `b.js` |
| `[abc]` | Character class — one of `a`, `b`, `c` | `file.[jt]s` | `file.js`, `file.ts` |
| `[a-z]` | Character range | `[a-z].js` | `a.js`, `z.js` |
| `[!abc]` / `[^abc]` | Negated character class | `[!0-9].js` | `a.js` (not `1.js`) |
| `{a,b,c}` | Brace expansion — one of the alternatives | `*.{js,ts}` | `a.js`, `a.ts` |
| `{1..5}` | Numeric range expansion | `file{1..3}.txt` | `file1.txt`, `file2.txt`, `file3.txt` |
| `{a..z}` | Alphabetic range expansion | `{a..c}.txt` | `a.txt`, `b.txt`, `c.txt` |
| `!(pat)` | Extglob: anything that does not match `pat` | `!(*.js)` | `a.ts` (not `a.js`) |
| `?(pat)` | Extglob: zero or one occurrence of `pat` | `?.?(js)` | `a`, `a.js` |
| `*(pat)` | Extglob: zero or more occurrences of `pat` | `*(foo)` | ``, `foo`, `foofoo` |
| `+(pat)` | Extglob: one or more occurrences of `pat` | `+(foo)` | `foo`, `foofoo` |
| `@(pat)` | Extglob: exactly one of the alternatives | `@(js\|ts)` | `js`, `ts` |
| `[[:alpha:]]` | POSIX class — alphabetic character | `[[:alpha:]]` | `a`, `Z` |
| `[[:digit:]]` | POSIX class — decimal digit | `[[:digit:]]` | `0`–`9` |
| `[[:alnum:]]` | POSIX class — alphanumeric | `[[:alnum:]]` | `a`–`z`, `A`–`Z`, `0`–`9` |
| `[[:upper:]]` | POSIX class — uppercase letter | — | `A`–`Z` |
| `[[:lower:]]` | POSIX class — lowercase letter | — | `a`–`z` |
| `[[:space:]]` | POSIX class — whitespace | — | ` `, `\t`, `\n`, etc. |
| `[[:word:]]` | POSIX class — word character | — | `a`–`z`, `A`–`Z`, `0`–`9`, `_` |
| `[[:xdigit:]]` | POSIX class — hex digit | — | `0`–`9`, `a`–`f`, `A`–`F` |
| `\\` | Escape — treat next character as literal | `foo\\.js` | `foo.js` (literal dot) |

Dotfiles (files starting with `.`) are not matched by `*`, `**`, or `?` unless the pattern explicitly starts with `.` or the `dot: true` option is set.

---

## Pattern Array Semantics

When you pass an array of patterns, matchbox applies include/exclude semantics:

- **Non-negated patterns** are treated as inclusions (OR logic). The input must match at least one.
- **Negated patterns** (starting with `!`) are exclusions. If the input matches any negated pattern, it is rejected regardless of inclusions.
- **Only negated patterns**: everything is included by default, then exclusions are applied.

```typescript
// OR: matches .js OR .ts
isMatch('a.ts', ['*.js', '*.ts']);                   // true

// Exclude: matches all .js, but not in test/
match(files, ['**/*.js', '!test/**']);

// Only negations: match everything except .md files
match(files, ['!*.md']);

// Mixed: match src .ts files, exclude test files
match(files, ['src/**/*.ts', '!src/**/*.test.ts']);
```

Multiple `!` prefixes cancel out (even count = positive, odd count = negated):

```typescript
isMatch('foo.js', '!!*.js');   // true (double-negation = positive)
isMatch('foo.js', '!!!*.js');  // false (triple-negation = negated)
```

---

## Migration Guide

### From micromatch

Replace the import and the API calls map directly:

| micromatch | matchbox |
|------------|---------|
| `import micromatch from 'micromatch'` | `import * as matchbox from '@agentine/matchbox'` |
| `micromatch.isMatch(str, pat)` | `matchbox.isMatch(str, pat)` |
| `micromatch.match(list, pat)` | `matchbox.match(list, pat)` |
| `micromatch.makeRe(pat)` | `matchbox.makeRe(pat)` |
| `micromatch.not(list, pat)` | `matchbox.not(list, pat)` |
| `micromatch.some(list, pat)` | `matchbox.some(list, pat)` |
| `micromatch.every(list, pat)` | `matchbox.every(list, pat)` |
| `micromatch.filter(pat)` | `matchbox.filter(pat)` |
| `micromatch.scan(pat)` | `matchbox.scan(pat)` |

```typescript
// Before
import micromatch from 'micromatch';
const matched = micromatch.match(files, ['**/*.ts', '!**/*.test.ts']);

// After
import { match } from '@agentine/matchbox';
const matched = match(files, ['**/*.ts', '!**/*.test.ts']);
```

### From picomatch

```typescript
// Before
import picomatch from 'picomatch';
const isMatch = picomatch('**/*.js');
isMatch('src/index.js');

// After
import { globMatch } from '@agentine/matchbox/glob';
const isMatch = globMatch('**/*.js');
isMatch('src/index.js');
```

| picomatch | matchbox |
|-----------|---------|
| `picomatch(pat)` | `import { globMatch } from '@agentine/matchbox/glob'; globMatch(pat)` |
| `picomatch.makeRe(pat)` | `import { globRe } from '@agentine/matchbox/glob'; globRe(pat)` |
| `picomatch.isMatch(str, pat)` | `import { isMatch } from '@agentine/matchbox/glob'; isMatch(str, pat)` |

### From braces

```typescript
// Before
import braces from 'braces';
braces('{a,b,c}', { expand: true });   // ['a', 'b', 'c']
braces('{a,b,c}');                     // '(a|b|c)'

// After
import { expand, braces } from '@agentine/matchbox/braces';
expand('{a,b,c}');                     // ['a', 'b', 'c']
braces('{a,b,c}');                     // '(a|b|c)'
```

### From fill-range, to-regex-range, is-number

```typescript
// Before
import fillRange from 'fill-range';
import toRegexRange from 'to-regex-range';
import isNumber from 'is-number';

// After
import { fillRange, toRegexRange, isNumber } from '@agentine/matchbox/range';
```

Full migration table:

| Package | Import | matchbox equivalent |
|---------|--------|---------------------|
| `micromatch` | `import micromatch from 'micromatch'` | `import * as matchbox from '@agentine/matchbox'` |
| `picomatch` | `import picomatch from 'picomatch'` | `import { globMatch, globRe, isMatch } from '@agentine/matchbox/glob'` |
| `braces` | `import braces from 'braces'` | `import { expand, braces } from '@agentine/matchbox/braces'` |
| `fill-range` | `import fillRange from 'fill-range'` | `import { fillRange } from '@agentine/matchbox/range'` |
| `to-regex-range` | `import toRegexRange from 'to-regex-range'` | `import { toRegexRange } from '@agentine/matchbox/range'` |
| `is-number` | `import isNumber from 'is-number'` | `import { isNumber } from '@agentine/matchbox/range'` |

### scan

`scan` is available from both the main entry point and the dedicated subpath:

```typescript
import { scan } from '@agentine/matchbox';
// or
import { scan } from '@agentine/matchbox/scan';
```

---

## Security

### ReDoS Protection

matchbox includes built-in protection against Regular Expression Denial of Service (ReDoS) attacks.

CVE-2024-4068 was a ReDoS vulnerability in the `braces` package where deeply nested or combinatorially explosive patterns (e.g., `{a,b,c,d,e,f,g,h,i,j}` nested many times) could cause catastrophic backtracking and hang a process. The same class of attack (CVE-2024-4067) affected micromatch.

matchbox mitigates this by design:

- **Maximum nesting depth**: brace expansion rejects patterns nested deeper than 10 levels.
- **Maximum expansion count**: brace expansion rejects patterns that would produce more than 10,000 entries.

Patterns that exceed these limits throw a descriptive `Error` synchronously rather than hanging:

```typescript
import { expand } from '@agentine/matchbox/braces';

// Throws: "Brace expansion exceeds maximum output count (10000). Pattern may cause combinatorial explosion."
expand('{a,b,c,d,e,f,g,h,i,j}{a,b,c,d,e,f,g,h,i,j}{a,b,c,d,e,f,g,h,i,j}{a,b,c,d,e,f,g,h,i,j}');
```

Extglob patterns (`*(pat)`, `+(pat)`) that nest quantifiers are also protected: inner quantifier extglobs are downgraded to `@(pat)` (exactly one) to prevent catastrophic backtracking in the compiled regex.

---

## License

MIT
