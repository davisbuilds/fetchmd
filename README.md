# fetchmd

TypeScript CLI for converting webpages or local HTML into clean,
token-efficient Markdown for AI workflows.

## Agent Setup

New here? Paste the prompt below into your coding agent (Claude Code, Codex, etc.) to set up the repo for development and verify it builds. Just want to use the tool? Install `@davisbuilds/fetchmd` globally as shown below.

```text
Set up the `fetchmd` repo for development. It's a TypeScript/Node CLI that converts
webpages (or local HTML) into clean, token-efficient markdown for AI workflows. No
env vars or secrets.

Do this, in order:
1. Install deps. Prereq: Node >= 22. Run `pnpm install` from the repo root. Clone
   https://github.com/davisbuilds/fetchmd.git and cd in first if needed.
2. Verify it builds and passes checks WITHOUT network: run `pnpm check`
   (lint + test + build — the e2e tests execute the built `dist/`), then
   `node dist/index.js --help`. Both should succeed. If either fails, show me the
   error and stop.
3. Report back: confirm `pnpm check` + help worked, and give me a real example to
   run (`node dist/index.js https://example.com`, or the global binary
   `fetchmd https://example.com`). Note that `--render` for JS-heavy pages needs
   Puppeteer installed separately.

Don't commit anything.
```

Prefer to do it yourself? The manual steps are below.

## What It Does

- Fetches HTTPS URLs or reads local HTML/stdin.
- Extracts article-like content with Mozilla Readability.
- Converts HTML to Markdown with Turndown and GFM table/task-list support.
- Emits Markdown to stdout for Unix pipelines.
- Supports JSON/stat output for automation.
- Optionally renders JS-heavy pages with Puppeteer via `--render`.
- Blocks common SSRF targets before network fetches.

## Quick Start

Requirements:

- Node.js `>=22`
- pnpm for development

Use the published CLI:

```bash
npm install -g @davisbuilds/fetchmd
fetchmd https://example.com
```

Set up the repo for development:

```bash
git clone https://github.com/davisbuilds/fetchmd.git
cd fetchmd
pnpm install
pnpm check
node dist/index.js --help
```

Optional render mode for JS-heavy pages requires Puppeteer:

```bash
pnpm add -D puppeteer      # repo-local development
npm install -g puppeteer   # global fetchmd install
```

## Common Commands

```bash
fetchmd https://example.com
fetchmd --file page.html
curl -s https://example.com | fetchmd
fetchmd --raw https://example.com
fetchmd --stats https://example.com
fetchmd --json https://example.com
fetchmd https://example.com https://docs.example.com
fetchmd --json --file a.html --file b.html
fetchmd --render https://spa.example.com
curl -s https://example.com | fetchmd | llm "summarize this"

pnpm check          # lint + test + build
pnpm test:dead-code
pnpm build
```

Run `fetchmd --help` for the full CLI reference.

## Security

- HTTPS-only for network fetches.
- HTTP, `file://`, and other protocols are rejected.
- Private/internal IPs are blocked before network requests.
- DNS resolution is validated against RFC 1918, loopback, and link-local ranges.
- Responses are capped at 5 MB with a 15-second timeout.
- Redirect targets are revalidated through the same checks.

`--render` validates the initial URL through the same SSRF checks, but a real
browser executes page JavaScript. Sub-resource requests and browser-internal
redirects are not intercepted. Only use `--render` with URLs you trust.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error; details are written to stderr |

## Code Layout

```text
src/              CLI source, extractors, renderers, and tests
dist/             compiled package output
skills/           agent skill wrapper for fetchmd usage
docs/             system, project, and plan docs
```

## Documentation

- Agent skill operator reference: [skills/SKILL.md](skills/SKILL.md)
- Agent implementation guidance: [AGENTS.md](AGENTS.md)
- Architecture: [docs/system/ARCHITECTURE.md](docs/system/ARCHITECTURE.md)
- Features and CLI behavior: [docs/system/FEATURES.md](docs/system/FEATURES.md)
- Operations, security notes, and release workflow: [docs/system/OPERATIONS.md](docs/system/OPERATIONS.md)
- Roadmap: [docs/project/ROADMAP.md](docs/project/ROADMAP.md)
- Git history and branch hygiene: [docs/project/GIT_HISTORY_POLICY.md](docs/project/GIT_HISTORY_POLICY.md)

## Current Boundaries

- Standard mode does not execute page JavaScript.
- Render mode requires Puppeteer and trusted URLs.
- Network fetches are intentionally HTTPS-only.
- The CLI writes output to stdout and diagnostics/errors to stderr.

## License

MIT
