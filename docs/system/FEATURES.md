# Features

## Core Capabilities

- Convert webpage HTML to clean markdown optimized for LLM/agent consumption
- Support three input modes:
  - URL positional argument
  - `--file <path>` local HTML input
  - stdin pipe input
- Extract main content (article-first) before conversion
- Preserve developer-relevant markdown structures (tables, fenced code blocks, lists)
- Work in Unix pipelines (`stdout` output, `stderr` errors)

## CLI Surface

```bash
fetchmd [url]
fetchmd --file page.html
curl -s https://example.com | fetchmd
```

### Flags

- `-f, --file <path>`: read HTML from local file
- `-h, --help`: usage and examples
- `-V, --version`: package version

## Input Rules

Exactly one input source is allowed per invocation:

- URL argument
- `--file`
- stdin (auto-detected when not TTY and no URL/file provided)

Ambiguous or missing input is rejected with an error.

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
- `1`: failure
