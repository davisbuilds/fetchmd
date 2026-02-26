# Architecture

`fetchmd` is a Node.js CLI that converts HTML into clean markdown through a linear pipeline:

1. Parse input mode (`url`, `--file`, or `stdin`)
2. Resolve and load HTML
3. Extract primary article content
4. Convert HTML to markdown
5. Write markdown to stdout

## Runtime Shape

- Language/runtime: TypeScript on Node.js (ESM)
- CLI parser: Commander
- Extraction: Mozilla Readability + JSDOM
- Conversion: Turndown + `turndown-plugin-gfm`
- Tests: Vitest (unit + e2e)

## Module Map

- `src/index.ts`: process entrypoint, EPIPE handling, top-level error handling
- `src/pipeline.ts`: orchestrates parse -> input -> extract -> convert -> stdout
- `src/cli.ts`: argument parsing and input mode disambiguation
- `src/input.ts`: URL/file/stdin input resolution with 5MB limit
- `src/security.ts`: URL protocol + DNS/IP SSRF validation
- `src/fetch.ts`: HTTPS fetch with timeout, size limit, manual redirects
- `src/extract.ts`: Readability extraction with body fallback
- `src/convert.ts`: HTML-to-markdown transformation and post-processing

## Data Flow

- URL mode:
  - `validateUrl()` enforces HTTPS and blocks private/internal hosts
  - `fetchHtml()` fetches with timeout and max size
  - Redirect locations are re-validated on each hop
- File/stdin mode:
  - HTML is read directly with size checks
- Extraction:
  - Readability extracts article content
  - If Readability fails, full `<body>` HTML is used as fallback
- Conversion:
  - Turndown converts to markdown
  - Post-processing trims trailing spaces, collapses blank lines, and ensures one trailing newline

## Error and Exit Behavior

- Success: markdown to stdout, exit code `0`
- Failure: error to stderr, exit code `1`
- Broken pipe (`EPIPE`): exits `0` to support Unix pipelines like `| head`

## Security Boundaries

- Allowed protocols: HTTPS only
- Blocked hostname: `localhost`
- Blocked IP ranges include loopback, private RFC1918, link-local, and IPv6 local ranges
- DNS resolution is validated before fetch
- Response/input limits reduce resource-exhaustion risk
