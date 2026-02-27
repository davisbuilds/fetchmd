---
date: 2026-02-26
topic: json-output-and-multi-url
stage: brainstorm
---

# JSON Output and Multi-URL Support

## What We Are Building

Two complementary features that make fetchmd more useful for LLM context building and programmatic integration:

1. **`--json` flag**: Structured JSON output wrapping the markdown with metadata (title, source URL, excerpt, word count, token estimate, byte size).
2. **Multi-URL support**: Accept multiple URL arguments in a single invocation, process them sequentially, and combine results.

## Why This Direction

The primary use case is feeding multiple pages into an LLM context window. Users want to grab several docs and combine them into one prompt. JSON mode serves the secondary programmatic use case — scripts that need to parse metadata alongside content.

## Key Decisions

- **JSON always includes stats**: Word count, token estimate, and byte size are included in JSON output automatically (cheap to compute, expected by programmatic consumers). The `--stats` flag remains separate for the stderr text line in plain markdown mode.
- **Multi-URL plain mode**: Results concatenated to stdout with `<!-- source: URL -->` comment and source URL as H2 heading before each page's content. Horizontal rule (`---`) between pages.
- **Multi-URL JSON mode**: Output is a JSON array of result objects (one per URL).
- **Single URL JSON mode**: Output is a single JSON object (not wrapped in an array) for backwards simplicity.
- **Error handling for multi-URL**: If one URL fails, write error to stderr and continue processing remaining URLs. Exit code 1 if any URL failed, 0 if all succeeded.
- **Multi-URL works with `--file` too**: Can pass multiple `--file` flags or mix URLs and files. Stdin remains single-input only.
- **Concurrency**: Sequential processing for v1. Keeps output ordering deterministic and avoids rate-limiting issues.

## JSON Schema

Single URL:
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "excerpt": "First paragraph summary...",
  "markdown": "# Page Title\n\nContent...",
  "stats": {
    "words": 1500,
    "tokens": 2000,
    "bytes": 8192
  }
}
```

Multi-URL:
```json
[
  { "url": "...", "title": "...", "markdown": "...", "stats": { ... } },
  { "url": "...", "title": "...", "markdown": "...", "stats": { ... } }
]
```

For file/stdin sources, `url` is replaced with `source` (file path or "stdin").

## CLI Surface Changes

```bash
# Single URL, JSON output
fetchmd --json https://example.com

# Multiple URLs
fetchmd https://example.com https://docs.example.com

# Multiple URLs with JSON
fetchmd --json https://a.com https://b.com

# Multiple files
fetchmd --file a.html --file b.html

# Mix URLs and files
fetchmd https://example.com --file local.html
```

## Constraints

- No new dependencies
- Sequential processing (no concurrency)
- Stdin remains single-input only (cannot combine with URL/file)
- Existing single-URL behavior must not change (non-breaking)

## Success Criteria

- `fetchmd --json <url>` outputs valid JSON with markdown, title, stats
- `fetchmd url1 url2` concatenates both results with headers and separators
- `fetchmd --json url1 url2` outputs a JSON array
- Failed URLs in multi-mode don't halt processing
- All existing tests continue to pass
- E2E tests cover single JSON, multi-URL plain, multi-URL JSON, and partial failure

## Open Questions

- Should `--json` pretty-print by default or use compact JSON? (Leaning: pretty-print, more readable for debugging; compact would save tokens but users can pipe through `jq -c`)

## Next Step

Proceed to planning.
