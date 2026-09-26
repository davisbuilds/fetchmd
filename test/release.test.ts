import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("release metadata", () => {
  it("keeps the package, release manifest, and newest changelog entry aligned", () => {
    const { version } = JSON.parse(read("package.json"));
    const manifest = JSON.parse(read(".release-please-manifest.json"));
    const heading = read("CHANGELOG.md").match(/^## (?:\[)?(\d+\.\d+\.\d+)(?:\])?(?:\s|$)/m);

    expect(manifest["."]).toBe(version);
    expect(heading?.[1]).toBe(version);
  });
});
