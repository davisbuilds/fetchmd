# Features

## Core Capabilities

- Convert webpage HTML to clean markdown optimized for LLM/agent consumption
- Support multiple input modes:
  - One or more URL positional arguments
  - One or more `--file <path>` local HTML inputs (repeatable)
  - stdin pipe input (single-input only, cannot combine with URL/file)
- Extract main content (article-first) before conversion
- Preserve developer-relevant markdown structures (tables, fenced code blocks, lists)
- Work in Unix pipelines (`stdout` output, `stderr` errors)

## CLI Surface

```bash
fetchmd [urls...]
fetchmd --file page.html
fetchmd --file a.html --file b.html
fetchmd url1 url2 --file local.html
curl -s https://example.com | fetchmd
```

### Flags

- `-f, --file <path>`: read HTML from local file (repeatable)
- `-r, --raw`: skip Readability extraction, convert full HTML to markdown
- `-s, --stats`: print word count, estimated token count, and output size to stderr
- `-j, --json`: output structured JSON with metadata and stats
- `-R, --render`: render JS-heavy pages in a headless browser before extraction (requires Puppeteer)
- `-h, --help`: usage and examples
- `-V, --version`: package version

## Input Rules

Multiple URL arguments and `--file` flags can be combined freely. Stdin is auto-detected when no explicit inputs are provided and the terminal is not a TTY. Stdin cannot be combined with URL or file inputs.

When multiple inputs are provided:
- **Plain mode**: results are concatenated with `<!-- source: ... -->` comments, H2 source headings, and `---` separators
- **JSON mode**: output is a JSON array of result objects

When a single input is provided:
- **Plain mode**: markdown output only (no source header)
- **JSON mode**: output is a single JSON object (not an array)

## JSON Output Schema

```json
{
  "source": "https://example.com",
  "title": "Page Title",
  "excerpt": "First paragraph...",
  "markdown": "# Page Title\n\nContent...",
  "stats": {
    "words": 1500,
    "tokens": 2000,
    "bytes": 8192
  }
}
```

Stats are always included in JSON output regardless of `--stats` flag.

## Multi-Input Error Handling

If one input fails in multi-input mode, the error is logged to stderr and processing continues with remaining inputs. Exit code is `1` if any input failed, `0` if all succeeded. If all inputs fail, the process exits with an error.

## Render Mode

When `--render` is active, URL inputs are loaded in a headless browser (Puppeteer) instead of a plain HTTP fetch. This enables content extraction from:

- **SPAs**: React, Vue, Angular apps where initial HTML is empty and content is rendered by JavaScript
- **Client-rendered pages**: Sites that rely on JS for primary content loading

Behavior:
- Puppeteer is an optional peer dependency — fetchmd works without it for standard pages
- `--render` only applies to URL inputs; file and stdin inputs are unaffected
- The browser waits for `networkidle2` (no more than 2 open connections for 500ms) before extracting HTML
- Default render timeout is 30 seconds; on timeout, partial content is used if available
- A single browser instance is shared across multiple URL inputs
- `--render` composes with all other flags (`--raw`, `--stats`, `--json`)

Security: The initial URL is validated through SSRF checks. Browser-internal redirects and sub-resource requests are not intercepted. Only use `--render` with URLs you trust.

## Conversion Behavior

- Headings use ATX format (`#`, `##`, ...)
- Code blocks are fenced and preserve language hints from `class="language-*"`
- GFM support includes tables and task list syntax
- Empty links are stripped
- Tracking/decorative pixel images are stripped
- Output is normalized to avoid excess blank lines and ends with a single newline

## Operational Limits

- HTTPS only for URL fetches
- Request timeout: 15 seconds (default), 30 seconds for `--render` mode
- Response size limit: 5MB (default)
- Redirect limit: 5 hops (manual, validated)
- File/stdin size limit: 5MB

## Exit Codes

- `0`: success
- `1`: failure (or partial failure in multi-input mode)
