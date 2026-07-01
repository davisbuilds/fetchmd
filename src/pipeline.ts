import type { Writable } from "node:stream";
import type { Browser } from "puppeteer";
import { type InputMode, parseArgs } from "./cli.js";
import { toMarkdown } from "./convert.js";
import { extractContent } from "./extract.js";
import { type InputOptions, resolveInput } from "./input.js";
import { mapWithConcurrency } from "./pool.js";
import { createBrowser, loadPuppeteer } from "./render.js";
import { computeStats, formatStats, type Stats } from "./stats.js";

// Max inputs processed in parallel. Bounds fan-out against target servers and
// (in --render mode) concurrent browser pages while still overlapping network
// waits for the common multi-URL case.
const CONCURRENCY = 5;

type Settled = { ok: true; result: ResultRecord } | { ok: false; source: string; message: string };

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
  warnings: string[];
}

function sourceLabel(input: InputMode): string {
  if (input.mode === "stdin") return "stdin";
  return input.value;
}

async function processOne(
  input: InputMode,
  raw: boolean,
  inputOpts: InputOptions,
): Promise<ResultRecord> {
  const source = sourceLabel(input);
  // Collect warnings per input so the pipeline can emit them in order (rather
  // than racing to process.stderr under concurrency).
  const warnings: string[] = [];
  const onWarn = (message: string) => warnings.push(message);

  const html = await resolveInput(input, { ...inputOpts, onWarn });

  let markdown: string;
  let title = "";
  let excerpt: string | undefined;

  if (raw) {
    markdown = toMarkdown(html);
  } else {
    const urlHint = input.mode === "url" ? input.value : undefined;
    const extracted = extractContent(html, urlHint, onWarn);
    const converted = toMarkdown(extracted.content);
    title = extracted.title || "";
    excerpt = extracted.excerpt;
    markdown = title ? `# ${title}\n\n${converted}` : converted;
  }

  return { source, title, excerpt, markdown, stats: computeStats(markdown), warnings };
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
    // Process inputs with bounded concurrency; each task captures its own
    // failure so the pool never rejects and ordering is preserved.
    const settled = await mapWithConcurrency<InputMode, Settled>(
      inputs,
      CONCURRENCY,
      async (input) => {
        try {
          return { ok: true, result: await processOne(input, raw, inputOpts) };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { ok: false, source: sourceLabel(input), message };
        }
      },
    );

    // Emit results, warnings, and errors in original input order for
    // deterministic output.
    const multiInput = inputs.length > 1;
    for (const outcome of settled) {
      if (outcome.ok) {
        results.push(outcome.result);
        for (const warning of outcome.result.warnings) {
          stderr.write(
            multiInput
              ? `${outcome.result.source}: Warning: ${warning}\n`
              : `Warning: ${warning}\n`,
          );
        }
      } else {
        hasErrors = true;
        stderr.write(`Error processing ${outcome.source}: ${outcome.message}\n`);
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
