import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { resolveInput } from "./input.js";

const tmpFiles: string[] = [];

function createTmpFile(content: string): string {
  const path = join(
    tmpdir(),
    `fetchmd-test-${Date.now()}-${Math.random().toString(36).slice(2)}.html`,
  );
  writeFileSync(path, content);
  tmpFiles.push(path);
  return path;
}

afterEach(() => {
  for (const f of tmpFiles) {
    try {
      unlinkSync(f);
    } catch {}
  }
  tmpFiles.length = 0;
});

describe("resolveInput", () => {
  it("reads from stdin", async () => {
    const stream = Readable.from(["<html><body>From stdin</body></html>"]);
    const html = await resolveInput({ mode: "stdin" }, { stdin: stream });
    expect(html).toContain("From stdin");
  });

  it("reads from file", async () => {
    const path = createTmpFile("<html><body>From file</body></html>");
    const html = await resolveInput({ mode: "file", value: path });
    expect(html).toContain("From file");
  });

  it("rejects empty stdin", async () => {
    const stream = Readable.from([""]);
    await expect(resolveInput({ mode: "stdin" }, { stdin: stream })).rejects.toThrow("empty");
  });

  it("rejects nonexistent file", async () => {
    await expect(resolveInput({ mode: "file", value: "/nonexistent/file.html" })).rejects.toThrow();
  });

  it("delegates URL to fetch pipeline", async () => {
    const mockFetch = async () =>
      new Response("<html><body>Fetched</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    const html = await resolveInput(
      { mode: "url", value: "https://example.com" },
      {
        fetch: mockFetch as typeof globalThis.fetch,
        dnsLookup: async () => ({ address: "93.184.216.34" }),
      },
    );
    expect(html).toContain("Fetched");
  });
});
