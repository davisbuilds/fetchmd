import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowser, RenderError, renderHtml } from "./render.js";

// Mock puppeteer module
vi.mock("puppeteer", () => {
  return {
    default: undefined, // will be overridden per test
  };
});

function createMockPage(contentHtml = "<html><body>rendered</body></html>") {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue(contentHtml),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockBrowser(page = createMockPage()) {
  return {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe("loadPuppeteer", () => {
  it("throws RenderError with install instructions when puppeteer is not available", async () => {
    // Override the dynamic import to fail
    vi.doMock("puppeteer", () => {
      throw new Error("Cannot find module 'puppeteer'");
    });

    // Re-import to pick up the mock
    const { loadPuppeteer: load } = await import("./render.js");
    await expect(load()).rejects.toThrow(RenderError);
    await expect(load()).rejects.toThrow("npm install -g puppeteer");
  });
});

describe("createBrowser", () => {
  it("launches with expected options", async () => {
    const launch = vi.fn().mockResolvedValue(createMockBrowser());
    const puppeteer = { launch };

    await createBrowser(puppeteer);

    expect(launch).toHaveBeenCalledWith({
      headless: true,
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
    });
  });
});

describe("renderHtml", () => {
  let mockPage: ReturnType<typeof createMockPage>;
  let mockBrowser: ReturnType<typeof createMockBrowser>;

  beforeEach(() => {
    mockPage = createMockPage();
    mockBrowser = createMockBrowser(mockPage);
  });

  it("navigates to URL with networkidle2 and returns rendered HTML", async () => {
    const url = new URL("https://example.com");
    const html = await renderHtml(url, mockBrowser as never);

    expect(mockPage.goto).toHaveBeenCalledWith("https://example.com/", {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });
    expect(html).toBe("<html><body>rendered</body></html>");
  });

  it("closes the page after extraction", async () => {
    const url = new URL("https://example.com");
    await renderHtml(url, mockBrowser as never);

    expect(mockPage.close).toHaveBeenCalled();
  });

  it("closes the page even on navigation error", async () => {
    mockPage.goto.mockRejectedValue(new Error("net::ERR_CONNECTION_REFUSED"));
    const url = new URL("https://example.com");

    await expect(renderHtml(url, mockBrowser as never)).rejects.toThrow(RenderError);
    expect(mockPage.close).toHaveBeenCalled();
  });

  it("falls back to partial content on timeout", async () => {
    const stderrWrite = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    mockPage.goto.mockRejectedValue(new Error("Navigation timeout of 30000ms exceeded"));
    mockPage.content.mockResolvedValue("<html><body>partial</body></html>");

    const url = new URL("https://example.com");
    const html = await renderHtml(url, mockBrowser as never);

    expect(html).toBe("<html><body>partial</body></html>");
    expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining("timed out"));

    stderrWrite.mockRestore();
  });

  it("uses custom timeout when provided", async () => {
    const url = new URL("https://example.com");
    await renderHtml(url, mockBrowser as never, { timeoutMs: 10_000 });

    expect(mockPage.goto).toHaveBeenCalledWith("https://example.com/", {
      waitUntil: "networkidle2",
      timeout: 10_000,
    });
  });
});
