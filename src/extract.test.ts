import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractContent } from "./extract.js";

function fixture(name: string): string {
  return readFileSync(resolve(import.meta.dirname, "../test/fixtures", name), "utf-8");
}

describe("extractContent", () => {
  it("extracts article content from a page with nav/footer", () => {
    const result = extractContent(fixture("article.html"), "https://example.com/post");
    expect(result.title).toBeTruthy();
    expect(result.content).toContain("main article");
    expect(result.content).not.toContain("Navigation");
  });

  it("extracts body from minimal HTML", () => {
    const result = extractContent(fixture("minimal.html"));
    expect(result.content).toContain("Hello");
  });

  it("handles malformed HTML without crashing", () => {
    const result = extractContent(fixture("malformed.html"));
    expect(result.content).toBeTruthy();
  });

  it("throws on empty HTML", () => {
    expect(() => extractContent("")).toThrow("empty HTML");
  });

  it("throws on whitespace-only HTML", () => {
    expect(() => extractContent("   \n  ")).toThrow("empty HTML");
  });
});
