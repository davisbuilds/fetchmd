---
date: 2026-02-25
topic: fetchmd-design
stage: implementation-plan
status: draft
source: conversation
---

# fetchmd Implementation Plan

## Goal

Build and publish `fetchmd`, a TypeScript + Node.js CLI tool that converts webpage HTML to clean, token-efficient markdown for AI agent consumption. The tool should be zero-config, Unix-composable, and secure by default.

## Scope

**In scope:**
- CLI entrypoint with URL argument, stdin pipe, and `--file` input modes
- HTTPS-only URL fetching with SSRF prevention (private IP rejection)
- Content extraction via Mozilla Readability (JSDOM)
- HTML-to-markdown conversion via Turndown
- Response size limits and request timeouts
- Clean markdown output to stdout
- npm package published as `fetchmd`
- MIT license

**Out of scope (deferred):**
- `--raw` mode (skip readability)
- `--render` mode (headless browser for JS-rendered pages)
- JSON output mode
- Token counting
- Batch URL processing
- Configuration files

## Assumptions And Constraints

- Node.js >= 22 (matches summarize project convention, native fetch stable)
- pnpm for package management
- ESM-only (`"type": "module"`)
- Target: < 2 second end-to-end for a typical article URL
- JSDOM is acceptable for Readability (no browser dependency)
- Turndown handles tables, code blocks, nested lists out of the box (with GFM plugin)
- Errors go to stderr, content goes to stdout (Unix convention)
- Exit codes: 0 = success, 1 = error (simple, matches feed project pattern)
- Dependency injection for fetch/stdin/stdout (matches summarize pattern, enables testing)
- EPIPE on broken pipe exits cleanly with 0 (matches summarize pattern)

## Conventions (from existing projects)

These patterns are adopted from the `summarize` and `feed` projects for consistency:

- **CLI parsing**: Commander.js (proven in summarize, handles --help/--version/errors)
- **TypeScript config**: `target: ES2023`, `module: NodeNext`, `moduleResolution: NodeNext`, `strict: true`
- **Linting/formatting**: Biome (matches summarize)
- **Testing**: Vitest (matches both projects)
- **Exit strategy**: `process.exitCode = 1` over `process.exit(1)` (deferred exit for cleanup)
- **Pipeline architecture**: fetch → extract → convert → stdout (matches feed's ingest → analyze → deliver)
- **Graceful degradation**: Readability failure falls back to body content (matches feed's partial-success philosophy)
- **Dependency injection**: Injectable fetch/streams for testability (matches summarize's `createLinkPreviewClient` pattern)

## Task Breakdown

### Task 1: Project scaffolding

**Objective:** Initialize the project with TypeScript, pnpm, Biome, Vitest, and essential configuration matching existing project conventions.

**Files:**
- `package.json`
- `tsconfig.json`
- `biome.jsonc`
- `vitest.config.ts`
- `.gitignore`
- `LICENSE`
- `src/index.ts` (stub)

**Dependencies:** None

**Implementation Steps:**
1. Initialize with `pnpm init`, set name `fetchmd`, `"type": "module"`, `engines: { "node": ">=22" }`
2. Install runtime deps: `commander`, `@mozilla/readability`, `turndown`, `turndown-plugin-gfm`, `jsdom`
3. Install dev deps: `typescript`, `@types/node`, `@types/turndown`, `@types/jsdom`, `vitest`, `@biomejs/biome`
4. Create `tsconfig.json`: target ES2023, module NodeNext, strict true, outDir `dist/`, rootDir `src/`
5. Create `biome.jsonc` with formatter (tabs → spaces, 100 width) and linter enabled
6. Create `vitest.config.ts` with environment node, include `src/**/*.test.ts`
7. Add `.gitignore`: node_modules, dist, .env, *.tgz, coverage
8. Add MIT LICENSE file (2026)
9. Create `src/index.ts` stub that prints version and exits
10. Add scripts: `build`, `dev`, `test`, `lint`, `format`, `check` (lint + test)
11. `git init` and initial commit

**Verification:**
```bash
pnpm install && pnpm build && node dist/index.js
pnpm lint
pnpm test
```

**Done When:**
- `pnpm build` produces `dist/index.js` with zero errors
- `pnpm lint` passes
- `pnpm test` runs (no tests yet, but framework works)
- Git repo initialized

---

### Task 2: CLI argument parsing with Commander.js

**Objective:** Parse CLI arguments using Commander.js to determine input mode (URL, stdin, file) and flags.

**Files:**
- `src/cli.ts`
- `src/cli.test.ts`
- `src/index.ts` (update entrypoint)

**Dependencies:** Task 1

**Implementation Steps:**
1. Create `src/cli.ts` exporting a `createProgram()` function that builds a Commander program
2. Define: positional `[url]` argument, `--file <path>` option, `--help`, `--version`
3. Detect stdin pipe via `!process.stdin.isTTY` when no URL or file is given
4. Validate exactly one input mode is active (URL xor stdin xor file) — error if ambiguous
5. Return typed result: `{ mode: 'url' | 'stdin' | 'file', value: string }`
6. Wire into `src/index.ts` — parse args, then delegate to pipeline (stub for now)
7. Add EPIPE handler: `process.on('EPIPE', () => { process.exit(0) })` at entrypoint

**Verification:**
```bash
pnpm build
node dist/index.js --help        # prints usage, exits 0
node dist/index.js --version     # prints version, exits 0
node dist/index.js 2>/dev/null; echo $?  # exits 1 (no input)
```

**Done When:**
- `--help` prints usage with URL, --file, and pipe modes documented
- `--version` prints version from package.json
- No input → error to stderr, exit 1
- Tests verify all argument combinations

---

### Task 3: URL validation and SSRF prevention

**Objective:** Validate input URLs and block private/internal IP ranges before any network request.

**Files:**
- `src/security.ts`
- `src/security.test.ts`

**Dependencies:** Task 1

**Implementation Steps:**
1. Create `src/security.ts` with `validateUrl(url: string): Promise<URL>`
2. Parse URL with `new URL()` — reject invalid syntax
3. Enforce protocol allowlist: HTTPS only (reject http, ftp, file, data, javascript)
4. Resolve hostname to IP via `dns.promises.lookup`
5. Check resolved IP against blocked ranges:
   - `127.0.0.0/8` (loopback)
   - `10.0.0.0/8` (private)
   - `172.16.0.0/12` (private)
   - `192.168.0.0/16` (private)
   - `169.254.0.0/16` (link-local)
   - `0.0.0.0/8` (unspecified)
   - `::1` (IPv6 loopback)
   - `fc00::/7` (IPv6 ULA)
   - `fe80::/10` (IPv6 link-local)
6. Reject `localhost` hostname explicitly (before DNS)
7. Return validated URL object or throw with descriptive message

**Verification:**
```bash
pnpm test -- src/security.test.ts
```
Tests must cover:
- Valid HTTPS URL → passes
- HTTP URL → rejected
- `file:///etc/passwd` → rejected
- `https://localhost` → rejected
- `https://127.0.0.1` → rejected
- `https://192.168.1.1` → rejected
- `https://10.0.0.1` → rejected
- `https://[::1]` → rejected
- Invalid URL string → rejected
- Valid public domain (e.g., `https://example.com`) → passes

**Done When:**
- All 10+ test cases pass
- No private/internal IP bypasses validation
- Only HTTPS URLs accepted

---

### Task 4: HTML fetching with resource limits

**Objective:** Fetch HTML from validated URLs with timeouts, size limits, and safe redirect handling.

**Files:**
- `src/fetch.ts`
- `src/fetch.test.ts`

**Dependencies:** Task 3

**Implementation Steps:**
1. Create `src/fetch.ts` with `fetchHtml(url: URL, options?: FetchOptions): Promise<string>`
2. Accept injectable `fetch` function for testing (default: `globalThis.fetch`)
3. Use `AbortController` with 15-second timeout
4. Set headers: `User-Agent: fetchmd/<version>`, `Accept: text/html`
5. Set `redirect: 'manual'` to handle redirects ourselves
6. On 3xx: extract Location header, re-validate through security module, follow (max 5 hops)
7. Validate response `Content-Type` contains `text/html`
8. Stream body with size enforcement (5MB max) — abort on overflow
9. Handle HTTP errors with clear messages: 404 "Page not found", 403 "Access denied", 5xx "Server error"
10. Return HTML string

**Verification:**
```bash
pnpm test -- src/fetch.test.ts
```
Tests (using injected mock fetch):
- Successful HTML fetch returns content
- Timeout aborts after configured limit
- Oversized response is rejected
- Non-HTML content-type is rejected
- Redirect chain re-validates each URL
- Redirect loop (>5 hops) is rejected
- HTTP 404/403/500 produce clear error messages

**Done When:**
- Fetch works for valid URLs with mocked responses
- All resource limits enforced
- Redirects re-validated through SSRF checks

---

### Task 5: Content extraction via Readability

**Objective:** Extract main article content from HTML, stripping navigation, ads, and boilerplate.

**Files:**
- `src/extract.ts`
- `src/extract.test.ts`
- `test/fixtures/article.html`
- `test/fixtures/minimal.html`
- `test/fixtures/malformed.html`

**Dependencies:** Task 1

**Implementation Steps:**
1. Create `src/extract.ts` with `extractContent(html: string, url?: string): ExtractResult`
2. Define `ExtractResult`: `{ title: string; content: string; excerpt?: string }`
3. Parse HTML into DOM using `new JSDOM(html, { url })`
4. Run `new Readability(doc).parse()`
5. If Readability returns an article: return `{ title, content: article.content, excerpt }`
6. If Readability returns null: fall back to `document.body.innerHTML` with title from `<title>` tag
7. Log fallback to stderr: `"Warning: readability extraction failed, using full body"`
8. Handle edge cases: empty string → error, null body → error

**Verification:**
```bash
pnpm test -- src/extract.test.ts
```
Tests with HTML fixture files:
- Article with nav/header/footer → extracts only article content
- Minimal valid HTML → extracts body
- Malformed HTML → graceful fallback, no crash
- Empty HTML → descriptive error

**Done When:**
- Readability extracts main content from article-shaped HTML
- Boilerplate stripped
- Fallback works when Readability can't identify main content
- Malformed input handled gracefully

---

### Task 6: Markdown conversion via Turndown

**Objective:** Convert extracted HTML to clean, token-efficient markdown.

**Files:**
- `src/convert.ts`
- `src/convert.test.ts`

**Dependencies:** Task 1

**Implementation Steps:**
1. Create `src/convert.ts` with `toMarkdown(html: string): string`
2. Configure Turndown instance:
   - `headingStyle: 'atx'`
   - `codeBlockStyle: 'fenced'`
   - `bulletListMarker: '-'`
   - `emDelimiter: '*'`
   - `hr: '---'`
3. Register `turndown-plugin-gfm` (tables, strikethrough, task lists)
4. Add custom rules:
   - Strip empty links (`<a>` with no href or empty text)
   - Strip decorative images (1x1 pixels, tracking pixels, spacer gifs)
   - Preserve `<pre><code>` language class as fenced code language hint
5. Post-process output:
   - Collapse 3+ consecutive blank lines to 2
   - Trim trailing whitespace from each line
   - Ensure single trailing newline
6. Return clean markdown string

**Verification:**
```bash
pnpm test -- src/convert.test.ts
```
Tests:
- `<h1>` through `<h6>` → `#` through `######`
- `<table>` → GFM pipe table
- `<pre><code class="language-js">` → ` ```js ` fenced block
- Nested `<ul><li><ul><li>` → indented lists
- `<a href="...">text</a>` → `[text](...)`
- Empty links stripped
- 5+ blank lines → collapsed to 2
- Output ends with single `\n`

**Done When:**
- All HTML element types convert correctly
- GFM tables work
- Code blocks preserve language hints
- Output is clean and token-efficient

---

### Task 7: Input mode handling (stdin and file)

**Objective:** Unify all input sources (URL, stdin, file) into a single HTML string.

**Files:**
- `src/input.ts`
- `src/input.test.ts`

**Dependencies:** Tasks 2, 4

**Implementation Steps:**
1. Create `src/input.ts` with `resolveInput(mode: InputMode, options?: InputOptions): Promise<string>`
2. Accept injectable `fetch` and `stdin` stream for testing
3. URL mode: validate URL (security module) → fetch HTML (fetch module) → return string
4. Stdin mode: collect stdin chunks into buffer with 5MB limit → return string
5. File mode: validate path exists → read with `fs.promises.readFile` with 5MB limit → return string
6. All modes: validate result is non-empty, throw descriptive error if empty

**Verification:**
```bash
pnpm test -- src/input.test.ts
```
Tests:
- URL mode delegates to fetch (mock)
- Stdin mode reads piped content (mock readable stream)
- File mode reads from disk (temp file)
- Empty input → descriptive error
- Oversized stdin/file → rejected with size limit error

**Done When:**
- All three input modes return HTML strings
- Size limits enforced on all modes
- Empty input produces clear error

---

### Task 8: Pipeline integration

**Objective:** Wire all modules into the main CLI pipeline with proper error handling and EPIPE safety.

**Files:**
- `src/pipeline.ts`
- `src/index.ts` (finalize entrypoint)

**Dependencies:** Tasks 2, 3, 4, 5, 6, 7

**Implementation Steps:**
1. Create `src/pipeline.ts` with injectable dependencies:
   ```typescript
   interface PipelineOptions {
     fetch?: typeof globalThis.fetch
     stdout?: NodeJS.WritableStream
     stderr?: NodeJS.WritableStream
   }
   export async function run(args: string[], options?: PipelineOptions): Promise<void>
   ```
2. Pipeline flow: parse CLI → resolve input → extract content → convert to markdown → write to stdout
3. Error handling: catch at top level, write message to stderr, set `process.exitCode = 1`
4. EPIPE handling in `src/index.ts`: `process.stdout.on('error', (err) => { if (err.code === 'EPIPE') process.exit(0) })`
5. Ensure stdout receives ONLY the markdown string (no log lines, no prefix text)
6. Add title as first `# Title` line before content if Readability extracted a title

**Verification:**
```bash
pnpm build

# URL mode (live test)
node dist/index.js https://example.com

# Pipe mode
curl -s https://example.com | node dist/index.js

# File mode
echo '<html><body><h1>Test</h1><p>Hello world</p></body></html>' > /tmp/test.html
node dist/index.js --file /tmp/test.html

# Error handling
node dist/index.js https://localhost 2>&1 | head -1  # should show error
node dist/index.js 2>/dev/null; echo "Exit: $?"       # should be 1

# EPIPE safety
node dist/index.js https://example.com | head -1       # should not crash
```

**Done When:**
- Full pipeline works end-to-end for all input modes
- Errors go to stderr only, markdown to stdout only
- `process.exitCode` used (not `process.exit`) for clean shutdown
- EPIPE handled gracefully
- Injectable dependencies enable unit testing

---

### Task 9: End-to-end tests

**Objective:** Validate the full CLI against HTML fixtures and error scenarios.

**Files:**
- `test/e2e.test.ts`
- `test/fixtures/blog-article.html`
- `test/fixtures/docs-page.html`
- `test/fixtures/tables-and-code.html`
- `test/fixtures/empty.html`
- `test/fixtures/malformed.html`

**Dependencies:** Task 8

**Implementation Steps:**
1. Create fixture HTML files:
   - `blog-article.html`: article with nav, sidebar, footer, ads placeholder
   - `docs-page.html`: documentation with TOC sidebar
   - `tables-and-code.html`: page with GFM table and fenced code blocks
   - `empty.html`: minimal `<html><body></body></html>`
   - `malformed.html`: unclosed tags, invalid nesting
2. Write e2e tests using `execFile` to run compiled CLI as subprocess
3. Test each fixture via `--file` mode, assert markdown output
4. Test stdin pipe via subprocess stdin
5. Test error cases: no args (exit 1), bad URL (exit 1), nonexistent file (exit 1)
6. Assert stderr contains error messages, stdout is empty on error

**Verification:**
```bash
pnpm test
```

**Done When:**
- All fixture files produce expected markdown output
- All error paths tested with correct exit codes
- Both unit tests and e2e tests pass together

---

### Task 10: Package finalization and README

**Objective:** Finalize for npm publishing with bin entry, shebang, README, and local install verification.

**Files:**
- `package.json` (finalize bin, files, prepublishOnly)
- `README.md`
- `src/index.ts` (shebang comment for build output)

**Dependencies:** Task 9

**Implementation Steps:**
1. Ensure build output has shebang: add banner plugin or prepend `#!/usr/bin/env node\n` in build script
2. Set `package.json`:
   - `"bin": { "fetchmd": "./dist/index.js" }`
   - `"files": ["dist", "README.md", "LICENSE"]`
   - `"prepublishOnly": "pnpm run check"` (runs lint + test + build)
3. Write `README.md`:
   - One-liner description
   - Install: `npm install -g fetchmd`
   - Usage: URL, pipe, file examples
   - How it works (Readability + Turndown)
   - Security: HTTPS-only, SSRF protection, resource limits
   - Exit codes: 0 success, 1 error
   - License: MIT
4. Test: `pnpm link --global && fetchmd https://example.com`
5. Verify: `which fetchmd` resolves, `fetchmd --help` works, pipe works

**Verification:**
```bash
pnpm build && pnpm link --global
fetchmd --help
fetchmd --version
fetchmd https://example.com
echo "<h1>Test</h1><p>Content</p>" | fetchmd
fetchmd https://example.com | head -5  # EPIPE safe
```

**Done When:**
- `fetchmd` works as global command
- README is accurate and concise
- `pnpm run check` passes (lint + test + build)
- Package is ready for `npm publish`

## Risks And Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Readability fails on non-article pages | Medium | Medium | Fall back to body content with stderr warning; pluggable for `--raw` later |
| JSDOM performance on large pages | Low | Medium | 5MB response size limit prevents pathological cases |
| Turndown mishandles complex tables | Medium | Low | GFM plugin handles standard tables; document limitations |
| SSRF bypass via DNS rebinding | Low | High | Resolve DNS before fetch, validate resolved IP, manual redirect handling |
| npm name `fetchmd` taken | ~~Low~~ None | — | Verified available on 2026-02-25 |
| Commander.js + ESM compatibility | Low | Medium | Commander v12+ has full ESM support |

## Verification Matrix

| Task | Unit Tests | Integration/E2E | Manual |
|------|-----------|----------------|--------|
| 1. Scaffolding | — | `pnpm build && pnpm lint` | — |
| 2. CLI parsing | Argument combinations | `--help`, `--version` | — |
| 3. SSRF prevention | 10+ cases (IP ranges, protocols) | — | — |
| 4. HTML fetching | Mock fetch (timeout, size, redirects) | — | Live URL |
| 5. Extraction | Fixture HTML files | — | — |
| 6. Conversion | Per-element-type tests | — | Visual inspect |
| 7. Input modes | Mock stdin/file/fetch | — | Pipe test |
| 8. Pipeline | Injected deps | All input modes | Live test |
| 9. E2E | — | Subprocess + fixtures | — |
| 10. Packaging | — | `pnpm link --global` | Global CLI |

## Handoff

**Execution order:** 1 → 2 → 3 (parallel with 5, 6) → 4 → 7 → 8 → 9 → 10

Tasks 3, 5, and 6 have no interdependencies and can be developed in parallel after Task 1. Task 4 depends on 3 (security). Task 7 depends on 2 (CLI) and 4 (fetch). Task 8 integrates everything. Tasks 9 and 10 finalize.
