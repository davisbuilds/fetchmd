import { promises as fs } from "node:fs";
import type { Readable } from "node:stream";
import type { Browser } from "puppeteer";
import { type FetchOptions, fetchHtml } from "./fetch.js";
import { type RenderOptions, renderHtml } from "./render.js";
import { type ValidateUrlOptions, validateUrl } from "./security.js";

const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5MB

export interface InputOptions {
  fetch?: typeof globalThis.fetch;
  stdin?: Readable;
  dnsLookup?: ValidateUrlOptions["dnsLookup"];
  render?: boolean;
  browser?: Browser;
  renderOptions?: RenderOptions;
}

export type InputMode =
  | { mode: "url"; value: string }
  | { mode: "stdin" }
  | { mode: "file"; value: string };

async function readStream(stream: Readable, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.byteLength;
    if (totalBytes > maxBytes) {
      throw new Error(`Input exceeds ${maxBytes} byte limit`);
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks).toString("utf-8");
}

export async function resolveInput(input: InputMode, options?: InputOptions): Promise<string> {
  let html: string;

  switch (input.mode) {
    case "url": {
      const url = await validateUrl(input.value, { dnsLookup: options?.dnsLookup });
      if (options?.render && options.browser) {
        html = await renderHtml(url, options.browser, options.renderOptions);
      } else {
        const fetchOpts: FetchOptions = {
          fetch: options?.fetch,
          dnsLookup: options?.dnsLookup,
        };
        html = await fetchHtml(url, fetchOpts);
      }
      break;
    }

    case "stdin": {
      const stream = options?.stdin ?? process.stdin;
      html = await readStream(stream, MAX_INPUT_BYTES);
      break;
    }

    case "file": {
      const stat = await fs.stat(input.value);
      if (stat.size > MAX_INPUT_BYTES) {
        throw new Error(`File exceeds ${MAX_INPUT_BYTES} byte limit (${stat.size} bytes)`);
      }
      html = await fs.readFile(input.value, "utf-8");
      break;
    }
  }

  if (!html.trim()) {
    throw new Error("Input is empty. No HTML content to process.");
  }

  return html;
}
