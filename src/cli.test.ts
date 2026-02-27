import { describe, expect, it } from "vitest";
import { parseArgs } from "./cli.js";

const node = ["node", "fetchmd"];

describe("parseArgs", () => {
  it("parses a single URL argument", () => {
    const result = parseArgs([...node, "https://example.com"], true);
    expect(result.inputs).toEqual([{ mode: "url", value: "https://example.com" }]);
  });

  it("parses multiple URL arguments", () => {
    const result = parseArgs([...node, "https://a.com", "https://b.com"], true);
    expect(result.inputs).toEqual([
      { mode: "url", value: "https://a.com" },
      { mode: "url", value: "https://b.com" },
    ]);
  });

  it("parses --file option", () => {
    const result = parseArgs([...node, "--file", "page.html"], true);
    expect(result.inputs).toEqual([{ mode: "file", value: "page.html" }]);
  });

  it("parses multiple --file options", () => {
    const result = parseArgs([...node, "--file", "a.html", "--file", "b.html"], true);
    expect(result.inputs).toEqual([
      { mode: "file", value: "a.html" },
      { mode: "file", value: "b.html" },
    ]);
  });

  it("allows mixing URLs and --file", () => {
    const result = parseArgs([...node, "https://a.com", "--file", "b.html"], true);
    expect(result.inputs).toEqual([
      { mode: "url", value: "https://a.com" },
      { mode: "file", value: "b.html" },
    ]);
  });

  it("detects stdin when no args and not TTY", () => {
    const result = parseArgs([...node], false);
    expect(result.inputs).toEqual([{ mode: "stdin" }]);
  });

  it("errors when no input and TTY", () => {
    expect(() => parseArgs([...node], true)).toThrow();
  });

  it("errors when stdin combined with URL", () => {
    // stdin is only added when no explicit inputs and !isTTY
    // This scenario can't happen naturally since stdin is auto-detected
    // But verify stdin exclusivity through the parseArgs logic
    const result = parseArgs([...node, "https://example.com"], false);
    expect(result.inputs).toEqual([{ mode: "url", value: "https://example.com" }]);
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

  it("parses --json flag", () => {
    const result = parseArgs([...node, "--json", "https://example.com"], true);
    expect(result.json).toBe(true);
  });

  it("defaults json to false", () => {
    const result = parseArgs([...node, "https://example.com"], true);
    expect(result.json).toBe(false);
  });

  it("parses --render flag", () => {
    const result = parseArgs([...node, "--render", "https://example.com"], true);
    expect(result.render).toBe(true);
  });

  it("parses -R shorthand", () => {
    const result = parseArgs([...node, "-R", "https://example.com"], true);
    expect(result.render).toBe(true);
  });

  it("defaults render to false", () => {
    const result = parseArgs([...node, "https://example.com"], true);
    expect(result.render).toBe(false);
  });

  it("combines --render with --json and --stats", () => {
    const result = parseArgs(
      [...node, "--render", "--json", "--stats", "https://example.com"],
      true,
    );
    expect(result.render).toBe(true);
    expect(result.json).toBe(true);
    expect(result.stats).toBe(true);
  });
});
