import { describe, expect, it } from "vitest";
import { FetchError, fetchHtml } from "./fetch.js";

function mockFetch(response: {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  delay?: number;
}): typeof globalThis.fetch {
  return async (_input: string | URL | Request, init?: RequestInit) => {
    if (response.delay) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, response.delay);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    }
    const status = response.status ?? 200;
    const headers = new Headers(response.headers ?? { "content-type": "text/html" });
    const body = response.body ?? "<html><body>Hello</body></html>";
    return new Response(body, { status, headers });
  };
}

function mockRedirectFetch(chain: { status: number; location: string }[], final: string) {
  let hop = 0;
  return async (_input: string | URL | Request, _init?: RequestInit) => {
    if (hop < chain.length) {
      const redirect = chain[hop++];
      return new Response(null, {
        status: redirect.status,
        headers: { location: redirect.location },
      });
    }
    return new Response(final, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  };
}

// Returns a fetch that serves raw bytes (not UTF-8 re-encoded) so charset
// handling can be exercised end to end.
function mockBytesFetch(bytes: Uint8Array, contentType: string): typeof globalThis.fetch {
  const body = bytes as BodyInit;
  return async () => new Response(body, { status: 200, headers: { "content-type": contentType } });
}

const publicDns = async () => ({ address: "93.184.216.34" });

describe("fetchHtml", () => {
  it("decodes a non-UTF-8 body using the Content-Type charset", async () => {
    // 0xE9 is "é" in ISO-8859-1, but an invalid lone byte in UTF-8.
    const bytes = Uint8Array.from([
      ...Buffer.from("<html><body>caf", "latin1"),
      0xe9,
      ...Buffer.from("</body></html>", "latin1"),
    ]);
    const html = await fetchHtml(new URL("https://example.com"), {
      fetch: mockBytesFetch(bytes, "text/html; charset=iso-8859-1"),
    });
    expect(html).toContain("café");
    expect(html).not.toContain("�");
  });

  it("falls back to a <meta charset> declaration when the header omits charset", async () => {
    const bytes = Uint8Array.from([
      ...Buffer.from('<html><head><meta charset="iso-8859-1"></head><body>caf', "latin1"),
      0xe9,
      ...Buffer.from("</body></html>", "latin1"),
    ]);
    const html = await fetchHtml(new URL("https://example.com"), {
      fetch: mockBytesFetch(bytes, "text/html"),
    });
    expect(html).toContain("café");
  });

  it("falls back to UTF-8 for an unknown charset label", async () => {
    const bytes = Uint8Array.from(Buffer.from("<html><body>hello</body></html>", "utf-8"));
    const html = await fetchHtml(new URL("https://example.com"), {
      fetch: mockBytesFetch(bytes, "text/html; charset=not-a-real-charset"),
    });
    expect(html).toContain("hello");
  });

  it("fetches HTML successfully", async () => {
    const html = await fetchHtml(new URL("https://example.com"), {
      fetch: mockFetch({ body: "<html><body>Test</body></html>" }),
    });
    expect(html).toContain("Test");
  });

  it("rejects non-HTML content types", async () => {
    await expect(
      fetchHtml(new URL("https://example.com"), {
        fetch: mockFetch({ headers: { "content-type": "application/json" } }),
      }),
    ).rejects.toThrow(FetchError);
  });

  it("rejects oversized responses", async () => {
    const bigBody = "x".repeat(6 * 1024 * 1024);
    await expect(
      fetchHtml(new URL("https://example.com"), {
        fetch: mockFetch({ body: bigBody }),
        maxBytes: 5 * 1024 * 1024,
      }),
    ).rejects.toThrow("limit");
  });

  it("handles 404 with clear message", async () => {
    await expect(
      fetchHtml(new URL("https://example.com"), {
        fetch: mockFetch({ status: 404 }),
      }),
    ).rejects.toThrow("Page not found");
  });

  it("handles 403 with clear message", async () => {
    await expect(
      fetchHtml(new URL("https://example.com"), {
        fetch: mockFetch({ status: 403 }),
      }),
    ).rejects.toThrow("Access denied");
  });

  it("handles 500 with clear message", async () => {
    await expect(
      fetchHtml(new URL("https://example.com"), {
        fetch: mockFetch({ status: 500 }),
      }),
    ).rejects.toThrow("Server error");
  });

  it("follows redirects and re-validates each hop", async () => {
    const html = await fetchHtml(new URL("https://example.com"), {
      fetch: mockRedirectFetch(
        [{ status: 301, location: "https://www.example.com/page" }],
        "<html><body>Redirected</body></html>",
      ),
      dnsLookup: publicDns,
    });
    expect(html).toContain("Redirected");
  });

  it("rejects redirect loops (>5 hops)", async () => {
    const loopFetch = async () =>
      new Response(null, {
        status: 301,
        headers: { location: "https://example.com/loop" },
      });
    await expect(
      fetchHtml(new URL("https://example.com"), {
        fetch: loopFetch as typeof globalThis.fetch,
        dnsLookup: publicDns,
      }),
    ).rejects.toThrow("Too many redirects");
  });

  it("times out on slow responses", async () => {
    await expect(
      fetchHtml(new URL("https://example.com"), {
        fetch: mockFetch({ delay: 500 }),
        timeoutMs: 50,
      }),
    ).rejects.toThrow("timed out");
  });
});
