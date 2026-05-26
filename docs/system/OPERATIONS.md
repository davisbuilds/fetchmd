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
pnpm test:dead-code
pnpm build
pnpm check
```

`pnpm check` runs lint, tests, and build. It is also the `prepublishOnly` gate.

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

## CI

Workflow: `.github/workflows/ci.yml`

Jobs:

- Lint/dead-code: `pnpm lint`, `pnpm test:dead-code`
- Build/test: `pnpm build`, `pnpm test`

CI uses Node.js 24 and pnpm 10.15.0.

## Packaging and Publish Readiness

`prepublishOnly` runs `pnpm run check` (`lint + test + build`).

Before publishing:

1. Validate version in `package.json`
2. Run `pnpm check`
3. Run `pnpm test:dead-code`
4. Verify CLI output with at least one trusted URL and one file fixture
5. Publish from a clean working tree

## Security Operations

- Standard URL fetches validate the initial URL and every manual redirect target
  through `validateUrl()`.
- URL fetches are HTTPS-only and block localhost/private/link-local IP targets after
  DNS resolution.
- Standard fetches enforce request timeout, response-size, content-type, and redirect
  limits.
- `--render` validates the initial URL, but browser-internal redirects and
  sub-resource requests are not intercepted. Treat render-mode URLs as trusted input.
- Do not relax protocol, DNS, size, timeout, or redirect limits without explicit
  security review.

## No Runtime Environment Variables

`fetchmd` currently has no required runtime environment variables.

## Troubleshooting

- `Error: No input provided`: pass a URL, `--file`, or pipe stdin
- `Protocol ... is not allowed`: URL must be HTTPS
- `Hostname ... is blocked/resolved to private IP`: SSRF guard blocked target
- `Expected HTML content`: endpoint did not return HTML
- `Response exceeds ... byte limit`: content is over limit
- `Puppeteer is not installed` or render import failure: install optional peer
  dependency `puppeteer` or use standard fetch mode
