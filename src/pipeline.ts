import type { Writable } from "node:stream";
import type { Browser } from "puppeteer";
import { type InputMode, parseArgs } from "./cli.js";
import { toMarkdown } from "./convert.js";
import { extractContent } from "./extract.js";
import { type InputOptions, resolveInput } from "./input.js";
import { createBrowser, loadPuppeteer } from "./render.js";
import { computeStats, formatStats, type Stats } from "./stats.js";

export interface PipelineOptions {
  fetch?: typeof globalThis.fetch;
  stdout?: Writable;
  stderr?: Writable;
  stdin?: NodeJS.ReadableStream;
}

interface ResultRecord {
  source: string;
  title: string;
  excerpt?: string;
  markdown: string;
  stats: Stats;
}

function sourceLabel(input: InputMode): string {
  if (input.mode === "url") return input.value;
  if (input.mode === "file") return input.value;
  return "stdin";
}

async function processOne(
  input: InputMode,
  raw: boolean,
  inputOpts: InputOptions,
): Promise<ResultRecord> {
  const html = await resolveInput(input, inputOpts);
  const source = sourceLabel(input);

  let markdown: string;
  let title = "";
  let excerpt: string | undefined;

  if (raw) {
    markdown = toMarkdown(html);
  } else {
    const urlHint = input.mode === "url" ? input.value : undefined;
    const extracted = extractContent(html, urlHint);
    const converted = toMarkdown(extracted.content);
    title = extracted.title || "";
    excerpt = extracted.excerpt;
    markdown = title ? `# ${title}\n\n${converted}` : converted;
  }

  return { source, title, excerpt, markdown, stats: computeStats(markdown) };
}

export async function run(
  argv: string[],
  isTTY: boolean,
  options?: PipelineOptions,
): Promise<void> {
  const stdout = options?.stdout ?? process.stdout;
  const stderr = options?.stderr ?? process.stderr;

  const { inputs, raw, stats, json, render } = parseArgs(argv, isTTY);

  const inputOpts: InputOptions = {
    fetch: options?.fetch,
    stdin: options?.stdin as import("node:stream").Readable | undefined,
    render,
  };

  // Launch browser if --render is active and there are URL inputs
  let browser: Browser | undefined;
  if (render && inputs.some((i) => i.mode === "url")) {
    const puppeteer = await loadPuppeteer();
    browser = await createBrowser(puppeteer);
    inputOpts.browser = browser;
  }

  const results: ResultRecord[] = [];
  let hasErrors = false;

  try {
    for (const input of inputs) {
      try {
        const result = await processOne(input, raw, inputOpts);
        results.push(result);
      } catch (err) {
        hasErrors = true;
        const msg = err instanceof Error ? err.message : String(err);
        stderr.write(`Error processing ${sourceLabel(input)}: ${msg}\n`);
      }
    }
  } finally {
    await browser?.close();
  }

  if (results.length === 0) {
    throw new Error("All inputs failed.");
  }

  if (json) {
    const jsonResults = results.map((r) => ({
      source: r.source,
      title: r.title || undefined,
      excerpt: r.excerpt,
      markdown: r.markdown,
      stats: r.stats,
    }));
    const output = inputs.length === 1 ? jsonResults[0] : jsonResults;
    stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    const multi = results.length > 1;
    const parts: string[] = [];
    for (const result of results) {
      if (multi) {
        parts.push(
          `<!-- source: ${result.source} -->\n\n## ${result.source}\n\n${result.markdown}`,
        );
      } else {
        parts.push(result.markdown);
      }
    }
    stdout.write(parts.join("\n\n---\n\n"));
  }

  if (stats) {
    if (results.length === 1) {
      stderr.write(`${formatStats(results[0].stats)}\n`);
    } else {
      for (const r of results) {
        stderr.write(`${r.source}: ${formatStats(r.stats)}\n`);
      }
      const totals = results.reduce(
        (acc, r) => ({
          words: acc.words + r.stats.words,
          tokens: acc.tokens + r.stats.tokens,
          bytes: acc.bytes + r.stats.bytes,
        }),
        { words: 0, tokens: 0, bytes: 0 },
      );
      stderr.write(`total: ${formatStats(totals)}\n`);
    }
  }

  if (hasErrors) {
    process.exitCode = 1;
  }
}
