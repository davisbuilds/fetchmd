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
    await expect(load()).rejects.toThrow("pnpm add -D puppeteer");
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

  it("falls back to partial content on a TimeoutError (by error name) and reports via onWarn", async () => {
    // Puppeteer throws a named TimeoutError; the detection keys off the name,
    // not the message text (which varies across versions/locales).
    const timeoutErr = new Error("Waiting failed: 30000ms exceeded");
    timeoutErr.name = "TimeoutError";
    mockPage.goto.mockRejectedValue(timeoutErr);
    mockPage.content.mockResolvedValue("<html><body>partial</body></html>");
    const warnings: string[] = [];

    const url = new URL("https://example.com");
    const html = await renderHtml(url, mockBrowser as never, {
      onWarn: (m) => warnings.push(m),
    });

    expect(html).toBe("<html><body>partial</body></html>");
    expect(warnings).toContainEqual(expect.stringContaining("timed out"));
  });

  it("does not treat a non-timeout error as a timeout even if its message mentions 'timeout'", async () => {
    // A connection error whose message coincidentally contains "timeout" must
    // not trigger the partial-content fallback.
    mockPage.goto.mockRejectedValue(new Error("net::ERR_CONNECTION_REFUSED (timeout)"));
    mockPage.content.mockResolvedValue("<html><body>partial</body></html>");
    const warnings: string[] = [];

    const url = new URL("https://example.com");
    await expect(
      renderHtml(url, mockBrowser as never, { onWarn: (m) => warnings.push(m) }),
    ).rejects.toThrow(RenderError);
    expect(warnings).toEqual([]);
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
