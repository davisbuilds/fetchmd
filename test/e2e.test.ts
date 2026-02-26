import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CLI = resolve(import.meta.dirname, "../dist/index.js");
const FIXTURES = resolve(import.meta.dirname, "fixtures");

function run(
  args: string[],
  stdin?: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = execFile("node", [CLI, ...args], { timeout: 10_000 }, (err, stdout, stderr) => {
      resolve({ stdout, stderr, code: err ? (err as NodeJS.ErrnoException & { code?: number }).status ?? 1 : 0 });
    });
    if (stdin !== undefined) {
      proc.stdin?.write(stdin);
      proc.stdin?.end();
    }
  });
}

describe("e2e: --file mode", () => {
  it("converts a blog article", async () => {
    const { stdout, code } = await run(["--file", `${FIXTURES}/blog-article.html`]);
    expect(code).toBe(0);
    expect(stdout).toContain("# How to Build a CLI Tool");
    expect(stdout).toContain("## Step 1: Choose Your Language");
    expect(stdout).toContain("```");
    expect(stdout).toContain('import { Command } from "commander"');
    expect(stdout).not.toContain("ad-banner");
    expect(stdout).not.toContain("Related Posts");
    expect(stdout).not.toContain("All rights reserved");
  });

  it("converts a docs page with code blocks", async () => {
    const { stdout, code } = await run(["--file", `${FIXTURES}/docs-page.html`]);
    expect(code).toBe(0);
    expect(stdout).toContain("# API Reference");
    expect(stdout).toContain("```");
    expect(stdout).toContain("npm install -g fetchmd");
  });

  it("converts tables to GFM format", async () => {
    const { stdout, code } = await run(["--file", `${FIXTURES}/tables-and-code.html`]);
    expect(code).toBe(0);
    expect(stdout).toContain("| Feature |");
    expect(stdout).toContain("| Local-first |");
    expect(stdout).toContain("```");
    expect(stdout).toContain("curl -s https://example.com");
  });

  it("handles malformed HTML gracefully", async () => {
    const { stdout, code } = await run(["--file", `${FIXTURES}/malformed.html`]);
    expect(code).toBe(0);
    expect(stdout).toBeTruthy();
  });

  it("errors on empty HTML body", async () => {
    const { stderr, code } = await run(["--file", `${FIXTURES}/empty.html`]);
    expect(code).not.toBe(0);
    expect(stderr).toBeTruthy();
  });
});

describe("e2e: stdin mode", () => {
  it("converts piped HTML", async () => {
    const html = "<html><body><article><h1>Piped</h1><p>Content from stdin for testing.</p><p>More content here.</p><p>And even more.</p></article></body></html>";
    const { stdout, code } = await run([], html);
    expect(code).toBe(0);
    expect(stdout).toContain("Piped");
    expect(stdout).toContain("Content from stdin");
  });

  it("errors on empty stdin", async () => {
    const { stderr, code } = await run([], "");
    expect(code).not.toBe(0);
    expect(stderr).toBeTruthy();
  });
});

describe("e2e: --raw mode", () => {
  it("includes boilerplate that Readability would strip", async () => {
    const { stdout, code } = await run(["--raw", "--file", `${FIXTURES}/blog-article.html`]);
    expect(code).toBe(0);
    expect(stdout).toContain("How to Build a CLI Tool");
    // Raw mode preserves nav/footer content that Readability strips
    expect(stdout).toContain("Home");
    expect(stdout).toContain("All rights reserved");
  });
});

describe("e2e: --stats mode", () => {
  it("prints stats to stderr", async () => {
    const { stdout, stderr, code } = await run([
      "--stats",
      "--file",
      `${FIXTURES}/blog-article.html`,
    ]);
    expect(code).toBe(0);
    expect(stdout).toContain("# How to Build a CLI Tool");
    expect(stderr).toMatch(/\d[\d,]* words/);
    expect(stderr).toMatch(/~[\d,]+ tokens/);
    expect(stderr).toMatch(/[\d.]+ KB markdown/);
  });

  it("does not print stats without --stats flag", async () => {
    const { stderr, code } = await run(["--file", `${FIXTURES}/blog-article.html`]);
    expect(code).toBe(0);
    expect(stderr).not.toContain("tokens");
  });
});

describe("e2e: error cases", () => {
  it("errors on nonexistent file", async () => {
    const { stderr, code } = await run(["--file", "/nonexistent/path.html"]);
    expect(code).not.toBe(0);
    expect(stderr).toBeTruthy();
  });

  it("--help exits 0", async () => {
    const { stdout, code } = await run(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("Usage:");
  });

  it("--version exits 0", async () => {
    const { stdout, code } = await run(["--version"]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/\d+\.\d+\.\d+/);
  });
});
