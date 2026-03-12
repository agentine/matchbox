# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-12

Initial release of **matchbox** — a zero-dependency, consolidated glob matching library that replaces the fragmented micromatch ecosystem (micromatch, picomatch, braces, fill-range, to-regex-range, is-number).

### Added

- **`range.ts`** — `fillRange`, `toRegexRange`, `isNumber`: numeric and alphabetic range filling, optimized regex range generation, number type checking. Replaces fill-range, to-regex-range, and is-number.
- **`braces.ts`** — brace expansion (`{a,b,c}`, `{1..5}`, nested, zero-padded) with ReDoS protection enforcing expansion depth and output count limits. Replaces the braces package (CVE-2024-4068).
- **`glob.ts`** — core glob pattern matching engine with full bash-compatible feature support: `*`, `**`, `?`, character classes `[...]`, extglobs (`!()`, `?()`, `*()`, `+()`, `@()`), POSIX classes `[:alpha:]` etc., negation, and brace expansion. Replaces picomatch.
- **`scan.ts`** — glob pattern scanner that extracts base directory, glob portion, negation, and prefix metadata. Replaces picomatch's scan.
- **`index.ts`** — micromatch-compatible main API: `isMatch`, `match`, `makeRe`, `not`, `any`, `all`, `contains`, `capture`, `matchKeys`, `scan`, `braces`. Drop-in replacement for micromatch.
- **Subpath exports** — `matchbox`, `matchbox/glob`, `matchbox/braces`, `matchbox/range`, `matchbox/scan` for tree-shaking.
- **Full TypeScript** — TypeScript-first with complete type exports and declaration maps.
- **ESM** — ES module primary output.
- **240 tests** — covering all modules including micromatch/picomatch compatibility suite.

### Fixed

- ReDoS via nested extglob quantifiers — depth tracking prevents catastrophic backtracking (#67)
- `!(pat)` extglob negative lookahead regex generation (#99, #103)
- PUA (Private Use Area) sentinel character sanitization in user input patterns (#102)
- Multiple `!` negation prefix handling in `globRe` (#121)
- Multi-`!` prefix stripping propagated to `matchesPatternArray` and `scan` (#138)
- `braces()` regex mode now correctly applies step in range patterns
- `fillRange` zero-padding detection for negative number strings
