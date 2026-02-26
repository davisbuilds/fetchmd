# fetchmd

Convert any webpage to clean, token-efficient markdown for AI agents.

## Install

```bash
npm install -g fetchmd
```

Requires Node.js >= 22.

## Usage

```bash
# Fetch a URL and convert to markdown
fetchmd https://example.com

# Convert a local HTML file
fetchmd --file page.html

# Pipe HTML from stdin
curl -s https://example.com | fetchmd

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

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (details on stderr) |

## License

MIT
