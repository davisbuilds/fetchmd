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

- Release commit categories (PRs): checks every non-merge commit subject, including bot commits
- Lint/dead-code: `pnpm lint`, `pnpm test:dead-code`
- Build/test: `pnpm build`, `pnpm test`

CI uses Node.js 24 and installs pnpm via `pnpm/action-setup` (version derived from the `packageManager` field in `package.json`).
Installs use `pnpm install --frozen-lockfile`. Build/test also checks that the
package version, release manifest, newest changelog entry, and built CLI version agree.

## Releases

Release Please maintains a release PR with updates to `package.json`,
`.release-please-manifest.json`, and `CHANGELOG.md`. After that PR passes CI and a
maintainer merges it, successful main CI permits a `vX.Y.Z` tag and GitHub release.
Before running Release Please, the workflow checks that main still matches the
successful CI revision. An observed mismatch skips the run. This is a
point-in-time preflight, not a lock: a push between the check and Release Please's
API reads can advance main. Review the release PR and its CI before merging.
Merge commits and rebase merges remain supported. No auto-merge is configured.

Activation requires a GitHub App installed on this repository with Contents,
Issues, and Pull requests read/write permissions. Set repository Actions variable
`RELEASE_APP_CLIENT_ID` and secret `RELEASE_APP_PRIVATE_KEY`. The workflow mints a
short-lived token scoped to this repository and those three permissions; the
token action revokes it at job completion. The App creates release PRs so their
ordinary `pull_request` CI runs. There is no fallback to `GITHUB_TOKEN` or manual
release bypass. Without App configuration, the release workflow fails at token
creation; validation workflows still run normally.

The first automated release starts from version `0.1.0` and includes only commits
after bootstrap commit `78138fe42bc66f88f92c68de3048a2a016c32192` (main before
automation). This bounds the initial changelog without fabricating historical
releases. Release Please ignores `bootstrap-sha` after the first generated
release is merged. Keep the manifest in sync through release PRs thereafter.

Commit categories and version policy are in the
[history policy](../project/GIT_HISTORY_POLICY.md#release-classification).
Before merging a release PR, review its version, notes, and breaking changes and
check CI. The first release PR also verifies the App-to-CI path in GitHub; local
checks cannot prove installation permissions or remote event delivery.

## Packaging and Publish Readiness

`prepublishOnly` runs `pnpm run check` (`lint + build + test`).

`@davisbuilds/fetchmd` is already published to npm at `0.1.0` (registry checked
2026-09-26). This automation creates GitHub releases only; npm publication
remains a separate maintainer action. A GitHub release does not imply that its
version is available on npm.

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
