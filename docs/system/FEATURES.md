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

## Conversion Behavior

- Headings use ATX format (`#`, `##`, ...)
- Code blocks are fenced and preserve language hints from `class="language-*"`
- GFM support includes tables and task list syntax
- Empty links are stripped
- Tracking/decorative pixel images are stripped
- Output is normalized to avoid excess blank lines and ends with a single newline

## Operational Limits

- HTTPS only for URL fetches
- Request timeout: 15 seconds (default)
- Response size limit: 5MB (default)
- Redirect limit: 5 hops (manual, validated)
- File/stdin size limit: 5MB

## Exit Codes

- `0`: success
- `1`: failure (or partial failure in multi-input mode)
