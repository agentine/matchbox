# matchbox

**A zero-dependency, consolidated glob matching library that replaces the fragmented micromatch ecosystem.**

---

## Target

The micromatch ecosystem on npm — a cluster of 6 interdependent packages for glob pattern matching, brace expansion, and range generation, collectively downloaded **400M+ times per week**, all maintained by **a single individual** (Jon Schlinkert), with **known unpatched CVEs** and a history of slow security response.

### Packages Replaced

| Package | Weekly Downloads | Function |
|---------|-----------------|----------|
| `picomatch` | ~134M | Glob pattern matching (bash-compatible) |
| `micromatch` | ~64M | Extended glob matching (wraps picomatch + braces) |
| `fill-range` | ~65M | Fill number/letter ranges (`1..5` → `[1,2,3,4,5]`) |
| `to-regex-range` | ~65M | Convert number ranges to optimized regex |
| `braces` | ~41M | Brace expansion (`{a,b,c}`, `{1..5}`) |
| `is-number` | ~59M | Check if a value is a number |

### Why This Target

1. **Bus factor = 1.** Every package in the chain is authored and maintained by Jon Schlinkert. One compromised account, one burnout, one disappearance — and the entire JavaScript toolchain is affected.
2. **Known CVEs, slow patching.** braces CVE-2024-4068 (ReDoS, CVSS 7.5) and micromatch CVE-2024-4067 were reported with 90+ day responsible disclosure timelines. The fragmented maintenance model means patches are slow and inconsistent.
3. **Absurd fragmentation.** Six packages form a deeply nested dependency chain to accomplish what should be one module: `micromatch → braces → fill-range → to-regex-range → is-number`. The `is-number` package has 59M weekly downloads to check `typeof value === 'number'`.
4. **Used by everything.** Jest, webpack, Vite, ESLint, Storybook, chokidar, fast-glob, globby, Astro, Snowpack, AWS Amplify, Cloudflare Miniflare, rollup, and 5M+ projects depend on picomatch alone.
5. **No consolidated replacement exists.** `minimatch` covers basic glob matching but lacks brace expansion, extglobs, POSIX classes, and the extended features that micromatch provides. There is no single package that replaces the full stack.

---

## Scope

### In Scope

- Full glob pattern matching (bash-compatible: `*`, `**`, `?`, `[...]`, extglobs, POSIX classes)
- Brace expansion (`{a,b,c}`, `{1..5}`, `{a..z}`, nested braces)
- Range filling (numeric and alphabetic, with step support)
- Number range to optimized regex conversion
- micromatch-compatible API (match, isMatch, makeRe, scan, etc.)
- TypeScript-first with full type exports
- ESM primary
- Comprehensive test suite (>95% coverage)
- Migration guide from micromatch/picomatch/braces

### Out of Scope

- File system operations (globbing the filesystem is `fast-glob`/`glob`'s job — they consume matchers)
- Regex compilation beyond glob patterns (this is not a regex library)
- Path manipulation (that's `path` module territory)

---

## Architecture

### Single Package, Zero Dependencies

```
matchbox/
├── src/
│   ├── index.ts          # Main API — micromatch-compatible interface
│   ├── glob.ts           # Core glob pattern matching (replaces picomatch)
│   ├── braces.ts         # Brace expansion (replaces braces)
│   ├── range.ts          # Range filling and regex generation (replaces fill-range, to-regex-range, is-number)
│   └── scan.ts           # Glob pattern scanning/parsing (extract base, glob, negation info)
├── tests/
│   ├── glob.test.ts
│   ├── braces.test.ts
│   ├── range.test.ts
│   ├── scan.test.ts
│   └── compat.test.ts    # micromatch/picomatch API compatibility tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── PLAN.md
├── README.md
└── LICENSE               # MIT
```

### Module Exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./glob": "./dist/glob.js",
    "./braces": "./dist/braces.js",
    "./range": "./dist/range.js",
    "./scan": "./dist/scan.js"
  }
}
```

### API Design

#### Main API (micromatch replacement)

```typescript
import matchbox from 'matchbox';

// Test if a string matches a glob pattern
matchbox.isMatch('foo/bar.js', '**/*.js');        // true
matchbox.isMatch('foo/bar.ts', '**/*.js');        // false

// Filter an array of strings by glob pattern(s)
matchbox.match(['foo.js', 'bar.ts', 'baz.js'], '*.js');  // ['foo.js', 'baz.js']

// Compile a glob pattern to a RegExp
matchbox.makeRe('**/*.js');                       // RegExp

// Negation patterns
matchbox.isMatch('foo.js', '!*.ts');              // true
matchbox.match(files, ['**/*.js', '!test/**']);    // JS files, excluding test/

// Multiple patterns (OR logic)
matchbox.isMatch('foo.ts', ['*.js', '*.ts']);      // true

// Brace expansion
matchbox.isMatch('foo.js', '*.{js,ts}');          // true
matchbox.isMatch('src/index.ts', '{src,lib}/**'); // true

// Extglobs
matchbox.isMatch('foo.js', '*.+(js|ts)');         // true

// POSIX character classes
matchbox.isMatch('a', '[[:alpha:]]');             // true
```

#### Glob Matching (picomatch replacement)

```typescript
import { globMatch, globRe, isMatch } from 'matchbox/glob';

// Create a matcher function
const match = globMatch('**/*.js');
match('foo/bar.js');   // true
match('foo/bar.ts');   // false

// Compile to RegExp
const re = globRe('src/**/*.{js,ts}');

// Direct match test
isMatch('foo.js', '*.js');  // true
```

Supported glob features:
- `*` — match any characters except `/`
- `**` — match any characters including `/` (globstar)
- `?` — match single character except `/`
- `[abc]` — character class
- `[a-z]` — character range
- `[!abc]` / `[^abc]` — negated character class
- `{a,b,c}` — brace expansion (delegates to braces module)
- `{1..5}` — range expansion (delegates to braces/range modules)
- `!(pattern)` — negation extglob
- `?(pattern)` — optional extglob
- `*(pattern)` — zero or more extglob
- `+(pattern)` — one or more extglob
- `@(pattern)` — exactly one extglob
- `[:alpha:]`, `[:digit:]`, etc. — POSIX character classes
- `\\` — escape character

#### Brace Expansion (braces replacement)

```typescript
import { expand, braces } from 'matchbox/braces';

// Expand braces to array of strings
expand('{a,b,c}');           // ['a', 'b', 'c']
expand('{1..5}');            // ['1', '2', '3', '4', '5']
expand('{a..e}');            // ['a', 'b', 'c', 'd', 'e']
expand('{1..10..2}');        // ['1', '3', '5', '7', '9']
expand('{01..05}');          // ['01', '02', '03', '04', '05'] (zero-padded)
expand('foo/{a,b}/bar');     // ['foo/a/bar', 'foo/b/bar']
expand('{a,b{1..3}}');       // ['a', 'b1', 'b2', 'b3'] (nested)

// Compile braces to optimized regex-ready string
braces('{a,b,c}');           // '(a|b|c)'
braces('{1..5}');            // '([1-5])'
```

**ReDoS protection:** The parser enforces a maximum expansion depth and output count to prevent CVE-2024-4068-style denial of service attacks. Deeply nested or combinatorially explosive patterns are rejected with a descriptive error.

#### Range (fill-range + to-regex-range replacement)

```typescript
import { fillRange, toRegexRange, isNumber } from 'matchbox/range';

// Fill a range of numbers
fillRange(1, 5);             // ['1', '2', '3', '4', '5']
fillRange(1, 10, 2);         // ['1', '3', '5', '7', '9']
fillRange('a', 'e');         // ['a', 'b', 'c', 'd', 'e']
fillRange(1, 5, { pad: true }); // ['01', '02', '03', '04', '05']

// Generate optimized regex for number ranges
toRegexRange(1, 100);        // '[1-9]|[1-9][0-9]|100'
toRegexRange(1, 1000);       // optimized multi-segment regex
toRegexRange(0, 255);        // IP octet range

// Number checking (replaces is-number)
isNumber(5);                 // true
isNumber('5');               // true
isNumber(NaN);               // false
isNumber(Infinity);          // false
```

#### Scan (pattern parsing)

```typescript
import { scan } from 'matchbox/scan';

scan('src/**/*.js');
// {
//   base: 'src',
//   glob: '**/*.js',
//   isGlob: true,
//   negated: false,
//   prefix: 'src/'
// }

scan('!test/**');
// {
//   base: 'test',
//   glob: '**',
//   isGlob: true,
//   negated: true,
//   prefix: '!test/'
// }
```

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Zero dependencies | Eliminates transitive supply chain risk. Replaces a 6-package dependency chain with one auditable codebase. |
| TypeScript-first | Full type safety. The original packages are plain JS with community-maintained `@types` packages. |
| ESM primary | Modern default. The originals are CJS. |
| micromatch-compatible API | Migration must be trivial. Drop-in replacement for the most common usage patterns. |
| Subpath exports | Tree-shaking friendly. Use `matchbox/braces` without pulling in glob matching. |
| ReDoS protection built-in | CVE-2024-4068 was a ReDoS in braces. matchbox enforces expansion limits by design. |
| Vitest for testing | Fast, TypeScript-native, modern. Consistent with spectra. |
| MIT license | Maximum adoption, same as originals. |

---

## Deliverables

1. **`matchbox` npm package** — fully functional, published, zero-dependency
2. **README.md** — usage docs, migration guide from micromatch/picomatch/braces, API reference
3. **Test suite** — >95% coverage, including micromatch/picomatch compatibility tests
4. **Benchmark** — performance comparison against micromatch, picomatch, minimatch
5. **Migration guide** — step-by-step guide for replacing micromatch ecosystem with matchbox

---

## Implementation Phases

### Phase 1: Range & Brace Expansion
- `range.ts` — number range filling, regex generation, isNumber (replaces fill-range, to-regex-range, is-number)
- `braces.ts` — brace expansion with ReDoS protection (replaces braces)
- Tests for range and braces

### Phase 2: Core Glob Matching
- `glob.ts` — full glob pattern matching engine (replaces picomatch)
- `scan.ts` — glob pattern scanning/parsing
- Tests for glob matching (bash compatibility)

### Phase 3: Main API
- `index.ts` — micromatch-compatible API (match, isMatch, makeRe, not, any, etc.)
- Integration of glob + braces + range into unified API
- Compatibility test suite

### Phase 4: Polish & Ship
- micromatch/picomatch compatibility test suite
- Performance benchmarks
- README and migration guide
- npm publish setup (provenance, CI pipeline)
