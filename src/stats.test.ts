import { describe, expect, it } from "vitest";
import { computeStats, formatStats } from "./stats.js";

describe("computeStats", () => {
  it("counts words, tokens, and bytes", () => {
    const text = "Hello world, this is a test.";
    const stats = computeStats(text);
    expect(stats.words).toBe(6);
    expect(stats.bytes).toBe(28);
    expect(stats.tokens).toBe(Math.ceil(28 / 4));
  });

  it("handles empty string", () => {
    const stats = computeStats("");
    expect(stats.words).toBe(0);
    expect(stats.bytes).toBe(0);
    expect(stats.tokens).toBe(0);
  });

  it("counts multi-byte characters correctly", () => {
    const text = "Hello \u00e9\u00e8\u00ea";
    const stats = computeStats(text);
    expect(stats.bytes).toBeGreaterThan(text.length);
  });
});

describe("formatStats", () => {
  it("formats KB output", () => {
    const result = formatStats({ words: 1500, tokens: 2000, bytes: 8192 });
    expect(result).toBe("1,500 words | ~2,000 tokens | 8.0 KB markdown");
  });

  it("formats MB output", () => {
    const result = formatStats({ words: 50000, tokens: 60000, bytes: 2 * 1024 * 1024 });
    expect(result).toBe("50,000 words | ~60,000 tokens | 2.0 MB markdown");
  });
});
