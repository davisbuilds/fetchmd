import { createRequire } from "node:module";
import { type ValidateUrlOptions, validateUrl } from "./security.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_REDIRECTS = 5;

export class FetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "FetchError";
  }
}

export interface FetchOptions {
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  dnsLookup?: ValidateUrlOptions["dnsLookup"];
}

export async function fetchHtml(url: URL, options?: FetchOptions): Promise<string> {
  const fetchFn = options?.fetch ?? globalThis.fetch;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? MAX_RESPONSE_BYTES;
  const maxRedirects = options?.maxRedirects ?? MAX_REDIRECTS;

  let currentUrl = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchFn(currentUrl.href, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": `fetchmd/${pkg.version}`,
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new FetchError(`Request timed out after ${timeoutMs}ms`);
      }
      throw new FetchError(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timer);
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new FetchError(`Redirect (${response.status}) with no Location header`);
      }
      const redirectUrl = new URL(location, currentUrl.href);
      // Re-validate the redirect target through SSRF checks
      currentUrl = await validateUrl(redirectUrl.href, {
        dnsLookup: options?.dnsLookup,
      });
      continue;
    }

    // Handle HTTP errors
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: "Authentication required",
        403: "Access denied",
        404: "Page not found",
        429: "Rate limited",
      };
      const msg = messages[response.status] ?? `Server error (${response.status})`;
      throw new FetchError(msg, response.status);
    }

    // Validate content type
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new FetchError(`Expected HTML content but got "${contentType}"`);
    }

    // Read body with size limit
    if (!response.body) {
      throw new FetchError("Response has no body");
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        reader.cancel();
        throw new FetchError(
          `Response exceeds ${maxBytes} byte limit (${totalBytes}+ bytes received)`,
        );
      }
      chunks.push(value);
    }

    const buffer = Buffer.concat(chunks);
    const charset = parseCharset(contentType) ?? sniffMetaCharset(buffer) ?? "utf-8";
    return decodeBuffer(buffer, charset);
  }

  throw new FetchError(`Too many redirects (>${maxRedirects})`);
}

// Extract a charset label from a Content-Type header value, if present.
function parseCharset(contentType: string): string | undefined {
  return /charset=["']?([^;"'\s]+)/i.exec(contentType)?.[1];
}

// Sniff a `<meta charset>` / `<meta http-equiv=content-type>` declaration from
// the start of the document (ASCII-safe latin1 read) for pages that omit the
// header charset.
function sniffMetaCharset(buffer: Buffer): string | undefined {
  const head = buffer.subarray(0, 1024).toString("latin1");
  return /<meta[^>]+charset=["']?([^"'>\s;]+)/i.exec(head)?.[1];
}

// Decode bytes with the resolved charset, falling back to UTF-8 when the label
// is unknown to the runtime's TextDecoder.
function decodeBuffer(buffer: Buffer, charset: string): string {
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}
