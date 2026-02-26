import { describe, expect, it } from "vitest";
import { parseArgs } from "./cli.js";

const node = ["node", "fetchmd"];

describe("parseArgs", () => {
  it("parses a URL argument", () => {
    const result = parseArgs([...node, "https://example.com"], true);
    expect(result.input).toEqual({ mode: "url", value: "https://example.com" });
  });

  it("parses --file option", () => {
    const result = parseArgs([...node, "--file", "page.html"], true);
    expect(result.input).toEqual({ mode: "file", value: "page.html" });
  });

  it("detects stdin when no args and not TTY", () => {
    const result = parseArgs([...node], false);
    expect(result.input).toEqual({ mode: "stdin" });
  });

  it("errors when no input and TTY", () => {
    expect(() => parseArgs([...node], true)).toThrow();
  });

  it("errors when both URL and --file provided", () => {
    expect(() =>
      parseArgs([...node, "https://example.com", "--file", "page.html"], true),
    ).toThrow();
  });

  it("parses --raw flag", () => {
    const result = parseArgs([...node, "--raw", "https://example.com"], true);
    expect(result.raw).toBe(true);
  });

  it("defaults raw to false", () => {
    const result = parseArgs([...node, "https://example.com"], true);
    expect(result.raw).toBe(false);
  });

  it("parses --stats flag", () => {
    const result = parseArgs([...node, "--stats", "https://example.com"], true);
    expect(result.stats).toBe(true);
  });

  it("defaults stats to false", () => {
    const result = parseArgs([...node, "https://example.com"], true);
    expect(result.stats).toBe(false);
  });
});
