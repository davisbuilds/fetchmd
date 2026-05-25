# fetchmd

Convert any webpage to clean, token-efficient markdown for AI agents.

## Agent Setup

New here? Paste the prompt below into your coding agent (Claude Code, Codex, etc.) to set up the repo for development and verify it builds. (Just want to use the tool? `npm install -g @davisbuilds/fetchmd` — see Install below.)

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

Prefer to do it yourself? Install and usage are below.

## Install

```bash
npm install -g @davisbuilds/fetchmd
```

Requires Node.js >= 22.

### Optional: Render Mode

To convert JS-heavy pages (SPAs, client-rendered content), install [Puppeteer](https://purl.org/nicktomlin/puppeteer):

```bash
pnpm add -D puppeteer
```

If you are using a global `fetchmd` install, install Puppeteer globally instead:

```bash
npm install -g puppeteer
```

Then use the `--render` flag. This is optional; fetchmd works without Puppeteer for standard pages.

## Usage

```bash
# Fetch a URL and convert to markdown
fetchmd https://example.com

# Convert a local HTML file
fetchmd --file page.html

# Pipe HTML from stdin
curl -s https://example.com | fetchmd

# Skip content extraction, convert full HTML
fetchmd --raw https://example.com

# Show word count, token estimate, and output size
fetchmd --stats https://example.com

# Structured JSON output with metadata and stats
fetchmd --json https://example.com

# Convert multiple URLs at once
fetchmd https://example.com https://docs.example.com

# Multiple files, JSON array output
fetchmd --json --file a.html --file b.html

# Render JS-heavy pages (requires Puppeteer)
fetchmd --render https://spa.example.com

# Compose with other tools
curl -s https://example.com | fetchmd | llm "summarize this"
```

## How It Works

1. **Fetch** — Downloads HTML over HTTPS with timeout and size limits
2. **Extract** — Strips navigation, ads, and boilerplate using [Mozilla Readability](https://github.com/mozilla/readability)
3. **Convert** — Transforms HTML to clean markdown using [Turndown](https://github.com/mixmark-io/turndown) with GFM support (tables, task lists, strikethrough)

Output goes to stdout. Errors go to stderr. Designed for Unix pipelines.

## Security

- HTTPS-only (HTTP, file://, and other protocols are rejected)
- SSRF prevention: private/internal IPs are blocked before any network request
- DNS resolution validated against RFC 1918, loopback, and link-local ranges
- 5MB response size limit and 15-second timeout
- Redirect targets are re-validated through the same security checks

**Note on `--render` mode**: When using `--render`, the initial URL is validated through the same SSRF checks. However, since a real browser executes the page's JavaScript, sub-resource requests and browser-internal redirects are not intercepted. Only use `--render` with URLs you trust.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (details on stderr) |

## Documentation

- Agent skill (operator reference): [skills/SKILL.md](skills/SKILL.md)
- Agent guidance (developer reference): [AGENTS.md](AGENTS.md)
- Architecture: [docs/system/ARCHITECTURE.md](docs/system/ARCHITECTURE.md)
- Features and CLI behavior: [docs/system/FEATURES.md](docs/system/FEATURES.md)
- Operations and release workflow: [docs/system/OPERATIONS.md](docs/system/OPERATIONS.md)
- Roadmap: [docs/project/ROADMAP.md](docs/project/ROADMAP.md)
- Git history and branch hygiene: [docs/project/GIT_HISTORY_POLICY.md](docs/project/GIT_HISTORY_POLICY.md)

## License

MIT
