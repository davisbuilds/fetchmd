---
name: fetchmd
description: >
  Fetch webpages or local HTML and convert to clean, token-efficient markdown.
  Use when you need to ingest web content for summarization, RAG, research,
  or any AI workflow that requires readable text from URLs or HTML files.
---

# fetchmd

Convert webpages and HTML to clean markdown optimized for LLM context windows.

## Install

```bash
npx @davisbuilds/fetchmd          # run without installing
npm install -g @davisbuilds/fetchmd  # or install globally
```

## Usage

```bash
# Single URL
fetchmd https://example.com

# Multiple URLs (outputs concatenated, separated by headings)
fetchmd https://a.com https://b.com

# Local HTML file (repeatable)
fetchmd --file page.html
fetchmd --file a.html --file b.html

# Stdin
curl -s https://example.com | fetchmd
```

## Options

| Flag | Description |
|------|-------------|
| `-f, --file <path>` | Read HTML from local file (repeatable) |
| `-r, --raw` | Skip Readability extraction, convert full HTML |
| `-s, --stats` | Print word count, token estimate, and size to stderr |
| `-j, --json` | Output structured JSON with metadata and stats |
| `-R, --render` | Render JS-heavy pages via headless browser (requires Puppeteer) |

## Output

**Plain (default)**: Markdown to stdout, errors/warnings to stderr.

**JSON** (`--json`): Single input returns an object, multiple inputs returns an array.

```jsonc
// Single input
{
  "source": "https://example.com",
  "title": "Page Title",
  "excerpt": "First sentence or meta description",
  "markdown": "# Page Title\n\nContent...\n",
  "stats": { "words": 101, "tokens": 162, "bytes": 646 }
}

// Multiple inputs → array of the same shape
[{ "source": "...", ... }, { "source": "...", ... }]
```

**Stats** (`--stats`): Prints summary to stderr (does not affect stdout).

```
101 words | ~162 tokens | 0.6 KB markdown
```

## Composability Patterns

```bash
# Feed a webpage into an LLM
fetchmd https://docs.example.com/api | llm "Summarize this API reference"

# Batch-fetch and process as JSON
fetchmd --json https://a.com https://b.com | jq '.[].markdown'

# Convert local HTML dump
fetchmd --file export.html > export.md

# Get token count before sending to LLM
fetchmd --stats https://example.com > content.md

# JS-heavy SPA (requires Puppeteer installed)
fetchmd --render https://spa.example.com

# Raw HTML when Readability strips too much
fetchmd --raw https://example.com
```

## Constraints

- **HTTPS only** — HTTP and non-HTTP protocols are rejected.
- **Stdin is single-input** — Cannot mix stdin with `--file` or URL args.
- **`--render` requires Puppeteer** — Install separately; only applies to URLs (not file/stdin).
- **Readability may fall back** — If extraction fails, full body is used with a stderr warning. Use `--raw` if extraction consistently strips needed content.
