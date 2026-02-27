---
date: 2026-02-26
topic: render-mode
stage: implementation-plan
status: draft
source: conversation
---

# --render Mode Implementation Plan

## Goal

Add a `--render` flag that uses Puppeteer (optional peer dependency) to render JS-heavy pages in a headless browser before content extraction. This enables fetchmd to handle SPAs and pages with client-side rendering that produce empty HTML without JavaScript execution.

## Scope

**In scope:**
- `--render` / `-R` CLI flag
- New `src/render.ts` module with `renderHtml()` function
- Puppeteer as optional peer dependency with dynamic import
- Integration into `resolveInput()` for URL-mode inputs only
- Browser lifecycle management (single instance, cleanup guarantees)
- Unit tests for render module (mocked Puppeteer)
- E2E tests for `--render` flag behavior
- Documentation updates (README, FEATURES, ARCHITECTURE, AGENTS/CLAUDE)

**Out of scope:**
- `--wait-for <selector>` option (future v2)
- Auto-scroll for infinite-scroll pages
- Screenshot capture
- Rendering file/stdin inputs in browser
- SSRF validation on browser sub-requests (documented trade-off)

## Assumptions And Constraints

- Puppeteer must not be a required dependency — fetchmd must install and run without it
- `--render` must compose with all existing flags (`--raw`, `--stats`, `--json`)
- `--render` on file/stdin inputs is silently ignored (file/stdin already have full HTML)
- Browser process must be reliably cleaned up even on errors and signals
- Render timeout defaults to 30 seconds (longer than fetch's 15s to allow for JS execution)
- Initial URL is validated through existing SSRF checks; browser-internal redirects are not intercepted
- All existing tests must continue to pass unchanged

## Task Breakdown

### Task 1: Add Puppeteer as optional peer dependency and configure types

**Objective**: Set up Puppeteer in package.json as an optional peer dependency with dev types available for development.

**Files**:
- `package.json`

**Dependencies**: None

**Implementation Steps**:
1. Add `puppeteer` to `peerDependencies` with version range `>=20.0.0`
2. Add `peerDependenciesMeta` with `puppeteer.optional: true`
3. Add `puppeteer` to `devDependencies` for type-checking and testing
4. Run `pnpm install` to update lockfile

**Verification**:
```bash
pnpm install
pnpm build
```
Expected: Clean install and build. Puppeteer types available.

**Done When**:
- `peerDependencies` and `peerDependenciesMeta` are set in package.json
- `pnpm build` succeeds with Puppeteer types available
- `pnpm install` in a fresh clone without Puppeteer globally does not fail

### Task 2: Create `src/render.ts` with `renderHtml()` and browser lifecycle helpers

**Objective**: Implement the core render module that dynamically imports Puppeteer, launches a browser, navigates to a URL, waits for render completion, and returns the rendered HTML.

**Files**:
- `src/render.ts` (new)

**Dependencies**: Task 1

**Implementation Steps**:
1. Create `src/render.ts`
2. Implement `loadPuppeteer()` — dynamic `import('puppeteer')` with try/catch that throws a clear install message on failure
3. Define `RenderOptions` interface: `{ timeoutMs?: number }`
4. Implement `createBrowser()` — launches headless Puppeteer with safe defaults (`--no-sandbox`, `--disable-gpu`, `--disable-dev-shm-usage`)
5. Implement `renderHtml(url: URL, browser: Browser, options?: RenderOptions): Promise<string>`:
   - Open new page
   - Navigate to URL with `waitUntil: 'networkidle2'` and configurable timeout (default 30s)
   - On navigation timeout: catch the timeout error, attempt `page.content()` to grab partial HTML, warn to stderr, return partial HTML if non-empty, otherwise re-throw
   - Extract rendered HTML via `page.content()`
   - Close page (not browser — browser is reused across inputs)
   - Return HTML string
6. Export `loadPuppeteer`, `createBrowser`, and `renderHtml`

**Verification**:
```bash
pnpm build
```
Expected: Clean compile with no type errors.

**Done When**:
- `renderHtml()` accepts a URL and browser instance, returns rendered HTML string
- Dynamic import fails gracefully with install instructions
- Navigation timeout falls back to partial content extraction
- Module compiles cleanly

### Task 3: Add `--render` / `-R` flag to CLI parser

**Objective**: Add the `--render` flag to Commander config and include it in `CliResult`.

**Files**:
- `src/cli.ts`

**Dependencies**: None (can parallel with Task 2)

**Implementation Steps**:
1. Add `render: boolean` to `CliResult` interface
2. Add `.option("-R, --render", "render JS-heavy pages in a headless browser (requires Puppeteer)")` to Commander config
3. Add `render: !!program.opts().render` to parseArgs return
4. Add render example to help text examples

**Verification**:
```bash
pnpm build && node dist/index.js --help
```
Expected: `--render` flag visible in help output with `-R` shorthand.

**Done When**:
- `--render` / `-R` flag parsed and included in CliResult
- Help text shows the flag with description
- Existing CLI tests still pass

### Task 4: Integrate render path into `resolveInput()` and `pipeline.ts`

**Objective**: Wire `--render` into the pipeline so URL inputs use headless rendering instead of HTTP fetch when the flag is active.

**Files**:
- `src/input.ts`
- `src/pipeline.ts`

**Dependencies**: Tasks 2, 3

**Implementation Steps**:

For `src/input.ts`:
1. Add `render?: boolean` and `browser?: Browser` (typed as `unknown` to avoid hard Puppeteer type dependency in this module) to `InputOptions`
2. In `resolveInput()`, when `input.mode === 'url'` and `options.render` is true and `options.browser` is truthy:
   - Still call `validateUrl()` for SSRF check on the initial URL
   - Call `renderHtml(url, options.browser)` instead of `fetchHtml(url, fetchOpts)`
3. File and stdin modes remain completely unchanged regardless of render flag

For `src/pipeline.ts`:
1. Import `loadPuppeteer`, `createBrowser` from `./render.js`
2. In `run()`, after `parseArgs()`:
   - If `render` is true and there are URL inputs:
     - Call `loadPuppeteer()` (fails early with install message if missing)
     - Call `createBrowser()` to get a browser instance
   - Wrap the input processing loop in a `try/finally` that calls `browser?.close()` in `finally`
3. Pass `render: true` and `browser` instance through `InputOptions` to `processOne()`
4. If `render` is true but all inputs are file/stdin, skip browser launch entirely (no error, no warning)

**Verification**:
```bash
pnpm build
pnpm test
```
Expected: All existing tests pass (render path not activated without `--render`).

**Done When**:
- URL inputs use `renderHtml()` when `--render` is active
- File/stdin inputs are unaffected by `--render`
- Browser is launched only when needed and always closed in finally
- SSRF validation still runs on the initial URL
- Existing test suite passes unchanged

### Task 5: Add unit tests for `src/render.ts`

**Objective**: Test the render module with mocked Puppeteer to verify dynamic import handling, browser lifecycle, and error paths.

**Files**:
- `src/render.test.ts` (new)

**Dependencies**: Task 2

**Implementation Steps**:
1. Create `src/render.test.ts`
2. Test: `loadPuppeteer()` throws clear install message when import fails (mock `import()` to reject)
3. Test: `renderHtml()` calls `page.goto()` with correct URL and `networkidle2` waitUntil
4. Test: `renderHtml()` returns `page.content()` result
5. Test: `renderHtml()` closes the page after extraction
6. Test: On navigation timeout, attempts partial content extraction and warns to stderr
7. Test: `createBrowser()` passes expected launch options

Use Vitest's `vi.mock()` to mock the Puppeteer module with fake browser/page objects.

**Verification**:
```bash
pnpm test src/render.test.ts
```
Expected: All render unit tests pass.

**Done When**:
- Dynamic import failure produces clear install message
- Happy path (navigate, extract, close) is verified
- Timeout fallback to partial content is verified
- Page cleanup is verified

### Task 6: Add CLI unit tests for `--render` flag

**Objective**: Verify `--render` flag parsing and interaction with other flags.

**Files**:
- `src/cli.test.ts`

**Dependencies**: Task 3

**Implementation Steps**:
1. Add test: `--render` flag sets `render: true` in CliResult
2. Add test: `-R` shorthand works
3. Add test: `--render` combines with `--json`, `--stats`, `--raw`
4. Add test: `--render` is accepted with file-only inputs (no error, just parsed)

**Verification**:
```bash
pnpm test src/cli.test.ts
```
Expected: All CLI tests pass, including new ones.

**Done When**:
- Flag parsing verified for long and short forms
- Flag composition with other flags verified
- No regressions in existing CLI tests

### Task 7: Add E2E tests for `--render` flag

**Objective**: End-to-end tests that verify `--render` behavior through the actual CLI binary.

**Files**:
- `test/e2e.test.ts`
- `test/fixtures/spa-shell.html` (new — minimal HTML fixture for render testing)

**Dependencies**: Tasks 4, 5, 6

**Implementation Steps**:
1. Create `test/fixtures/spa-shell.html` — a minimal HTML file with a `<script>` that writes content into the DOM after load (simulates a SPA). Something like: empty `<div id="app">`, inline script that sets `innerHTML` after a `setTimeout`.
2. Add E2E test: `--render --file spa-shell.html` — verify that even though `--render` is set, file mode doesn't use the browser (file is processed as-is, script content is not executed)
3. Add E2E test: `--render` without Puppeteer installed — this is hard to test in CI where Puppeteer IS installed. Instead, test that `--render` with a file input works normally (render flag is silently a no-op for files).
4. Add E2E test: `--render` composes with `--json` on a file input
5. Add E2E test: `--render` composes with `--stats` on a file input
6. Note: True E2E tests against live URLs with `--render` are manual verification only (network-dependent, slow). Document manual test commands in the plan.

**Verification**:
```bash
pnpm build && pnpm test
```
Expected: All tests pass including new E2E tests.

**Manual verification commands** (not automated):
```bash
# SPA that requires JS rendering
node dist/index.js --render https://angular.dev/overview
# Bot-protected page
node dist/index.js --render https://openai.com/index/unlocking-the-codex-harness/
# Multiple URLs with render
node dist/index.js --render --stats https://angular.dev/overview https://react.dev
```

**Done When**:
- E2E tests verify `--render` flag is accepted and composes with other flags
- File inputs with `--render` work without requiring Puppeteer to launch
- All existing E2E tests pass unchanged

### Task 8: Update documentation

**Objective**: Update all reference docs to include `--render` flag, its requirements, behavior, and security notes.

**Files**:
- `README.md`
- `docs/system/FEATURES.md`
- `docs/system/ARCHITECTURE.md`
- `CLAUDE.md` (hard-linked to `AGENTS.md`)
- `docs/project/ROADMAP.md`

**Dependencies**: Tasks 1–7

**Implementation Steps**:
1. **README.md**: Add `--render` to usage examples. Add note about Puppeteer requirement under Install or a new "Optional Dependencies" section.
2. **FEATURES.md**: Add `--render` to flags list. Add "Render Mode" section explaining behavior, Puppeteer requirement, URL-only scope, and security note. Update operational limits with render timeout.
3. **ARCHITECTURE.md**: Update data flow section to show render path as alternative to fetchHtml. Add Puppeteer to runtime shape (optional).
4. **CLAUDE.md/AGENTS.md**: Add render.ts to key files table. Add `--render` to implementation gotchas (optional dep, URL-only, security model difference).
5. **ROADMAP.md**: Move `--render` from planned to completed.

**Verification**:
```bash
grep -r "render" README.md docs/system/ CLAUDE.md
```
Expected: `--render` mentioned in all documentation files.

**Done When**:
- All docs reflect `--render` flag, Puppeteer requirement, and security notes
- ROADMAP updated
- No stale references to render as a future feature

## Risks And Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Puppeteer dynamic import fails in some Node/ESM configurations | `--render` broken | Low | Test on Node 22 ESM explicitly. Puppeteer has supported ESM imports since v20. |
| Chrome launch fails in constrained environments (Docker, CI) | `--render` unusable in those envs | Medium | Clear error message with link to Puppeteer troubleshooting. Launch args include `--no-sandbox` for Docker compat. |
| `networkidle2` insufficient for some SPAs | Partial/empty content extracted | Medium | Accepted for v1. Timeout fallback grabs partial content. `--wait-for` planned for v2. |
| Browser zombies on hard kill (SIGKILL) | Orphan Chrome processes | Low | Puppeteer's default signal handlers cover SIGINT/SIGTERM. SIGKILL is unhandleable by any process — accepted OS-level limitation. |
| Puppeteer version breaking changes | Type errors or runtime failures | Low | Pin peer dep to `>=20.0.0`. Use only stable core API (`launch`, `newPage`, `goto`, `content`, `close`). |

## Verification Matrix

| Task | Unit Tests | E2E Tests | Manual Check |
|------|-----------|-----------|--------------|
| 1. Peer dep setup | — | — | `pnpm install && pnpm build` |
| 2. render.ts module | render.test.ts (6 tests) | — | — |
| 3. CLI flag | cli.test.ts (4 new tests) | — | `--help` output |
| 4. Pipeline integration | — | — | `pnpm test` (no regressions) |
| 5. Render unit tests | render.test.ts | — | — |
| 6. CLI unit tests | cli.test.ts | — | — |
| 7. E2E tests | — | e2e.test.ts (4 new tests) | Manual URL tests |
| 8. Documentation | — | — | `grep` for coverage |

**Integration verification** (after all tasks):
```bash
pnpm check  # lint + test + build
node dist/index.js --render --stats https://angular.dev/overview
node dist/index.js --render --json https://angular.dev/overview
```

## Handoff

Execute tasks 1–8 sequentially. Tasks 2 and 3 can be done in parallel. All other tasks have sequential dependencies.

Total estimated scope: 8 tasks across 4 files modified, 2 files created, 5 docs updated.
