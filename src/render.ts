import type { Browser, Page } from "puppeteer";

const DEFAULT_RENDER_TIMEOUT_MS = 30_000;

export interface PuppeteerModule {
  launch: (options?: Record<string, unknown>) => Promise<Browser>;
}

export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderError";
  }
}

export async function loadPuppeteer(): Promise<PuppeteerModule> {
  try {
    const mod = await import("puppeteer");
    return mod.default ?? mod;
  } catch {
    throw new RenderError(
      "--render requires Puppeteer.\nInstall it with: npm install -g puppeteer",
    );
  }
}

export async function createBrowser(puppeteer: PuppeteerModule): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });
}

export interface RenderOptions {
  timeoutMs?: number;
}

export async function renderHtml(
  url: URL,
  browser: Browser,
  options?: RenderOptions,
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_RENDER_TIMEOUT_MS;

  let page: Page | undefined;
  try {
    page = await browser.newPage();
    try {
      await page.goto(url.href, {
        waitUntil: "networkidle2",
        timeout: timeoutMs,
      });
    } catch (err) {
      // On timeout, try to grab partial content
      if (err instanceof Error && err.message.includes("timeout")) {
        const partial = await page.content();
        if (partial && partial.trim().length > 0) {
          process.stderr.write(
            `Warning: render timed out after ${timeoutMs}ms, using partial content\n`,
          );
          return partial;
        }
      }
      throw new RenderError(
        `Failed to render ${url.href}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return await page.content();
  } finally {
    await page?.close();
  }
}
