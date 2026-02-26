# Operations

## Prerequisites

- Node.js `>=22`
- pnpm `>=10`

## Install

```bash
pnpm install
```

## Daily Commands

```bash
pnpm lint
pnpm test
pnpm build
pnpm check
```

## Local CLI Usage

From source tree:

```bash
node dist/index.js --help
node dist/index.js https://example.com
node dist/index.js --file test/fixtures/article.html
```

## Testing Notes

Vitest includes both:

- unit tests under `src/**/*.test.ts`
- e2e tests under `test/**/*.test.ts`

E2E tests execute `dist/index.js`, so run `pnpm build` first in a clean clone.

Suggested order:

```bash
pnpm build
pnpm test
```

## Packaging and Publish Readiness

`prepublishOnly` runs `pnpm run check` (`lint + test + build`).

Before publishing:

1. Validate version in `package.json`
2. Run `pnpm check`
3. Verify CLI output with at least one URL and one file fixture
4. Publish from a clean working tree

## No Runtime Environment Variables

`fetchmd` currently has no required runtime environment variables.

## Troubleshooting

- `Error: No input provided`: pass a URL, `--file`, or pipe stdin
- `Protocol ... is not allowed`: URL must be HTTPS
- `Hostname ... is blocked/resolved to private IP`: SSRF guard blocked target
- `Expected HTML content`: endpoint did not return HTML
- `Response exceeds ... byte limit`: content is over limit
