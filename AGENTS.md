# AGENTS.md

Guidance for AI agents working with this codebase.

## Project Overview

`fetchmd` is a TypeScript/Node CLI that fetches or ingests HTML and converts it to clean, token-efficient markdown for AI workflows.

Pipeline: parse input -> resolve HTML -> extract primary content -> convert to markdown -> stdout.

**Tech Stack**: Node.js 22+, TypeScript (ESM), Commander, JSDOM + Readability, Turndown (GFM), Vitest, Biome

## Commands

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm check
```

Direct CLI runs from repo:

```bash
node dist/index.js --help
node dist/index.js https://example.com
node dist/index.js --file test/fixtures/article.html
```

## Key Files Reference

| Purpose | Location |
|---------|----------|
| CLI entrypoint and process-level error handling | `src/index.ts` |
| Argument parsing and input mode disambiguation | `src/cli.ts` |
| End-to-end pipeline orchestration | `src/pipeline.ts` |
| URL fetch with timeout/size/redirect controls | `src/fetch.ts` |
| SSRF and protocol validation | `src/security.ts` |
| Input resolution for URL/file/stdin | `src/input.ts` |
| Readability extraction | `src/extract.ts` |
| Markdown conversion rules | `src/convert.ts` |
| Unit tests | `src/*.test.ts` |
| E2E tests and fixtures | `test/e2e.test.ts`, `test/fixtures/` |

## Architecture Patterns

**Single pipeline entrypoint**:
- `run()` in `src/pipeline.ts` is the canonical orchestration path.
- Keep stage boundaries explicit (parse, input, extract, convert, output).

**Security-first URL handling**:
- Validate protocol and network target in `src/security.ts` before fetching.
- Re-validate redirect locations on every hop in `src/fetch.ts`.

**Unix composability**:
- Content to stdout, errors to stderr.
- Preserve graceful broken-pipe behavior (EPIPE exits 0).

## Testing

- Framework: Vitest (`src/**/*.test.ts`, `test/**/*.test.ts`)
- E2E tests execute `dist/index.js`; build first in clean environments.

Recommended sequence:

```bash
pnpm build
pnpm test
```

## Implementation Gotchas

1. **Exactly one input mode**: URL, `--file`, or stdin. Avoid adding flows that bypass `parseArgs()` ambiguity checks.
2. **HTTPS-only by design**: Do not broaden protocols without explicit security review.
3. **Redirect safety**: Redirect targets must continue to pass `validateUrl()` checks.
4. **Resource limits are part of contract**: timeout, max bytes, and redirect limit are behavioral expectations, not optional tuning.
5. **Readability fallback warning**: `extractContent()` intentionally warns to stderr when extraction fails and body fallback is used.
6. **E2E dependency on build artifacts**: `test/e2e.test.ts` runs `dist/index.js`; tests fail if `dist/` is missing.

## Documentation Map

- System docs: `docs/system/ARCHITECTURE.md`, `docs/system/FEATURES.md`, `docs/system/OPERATIONS.md`
- Project docs: `docs/project/ROADMAP.md`, `docs/project/GIT_HISTORY_POLICY.md`
- Planning docs: `docs/plans/`
