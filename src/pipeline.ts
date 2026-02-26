import type { Writable } from "node:stream";
import { parseArgs } from "./cli.js";
import { toMarkdown } from "./convert.js";
import { extractContent } from "./extract.js";
import { type InputOptions, resolveInput } from "./input.js";

export interface PipelineOptions {
  fetch?: typeof globalThis.fetch;
  stdout?: Writable;
  stderr?: Writable;
  stdin?: NodeJS.ReadableStream;
}

export async function run(
  argv: string[],
  isTTY: boolean,
  options?: PipelineOptions,
): Promise<void> {
  const stdout = options?.stdout ?? process.stdout;
  const _stderr = options?.stderr ?? process.stderr;

  const { input, raw } = parseArgs(argv, isTTY);

  const inputOpts: InputOptions = {
    fetch: options?.fetch,
    stdin: options?.stdin as import("node:stream").Readable | undefined,
  };

  const html = await resolveInput(input, inputOpts);

  let output: string;
  if (raw) {
    output = toMarkdown(html);
  } else {
    const urlHint = input.mode === "url" ? input.value : undefined;
    const extracted = extractContent(html, urlHint);
    const markdown = toMarkdown(extracted.content);
    output = extracted.title ? `# ${extracted.title}\n\n${markdown}` : markdown;
  }

  stdout.write(output);
}
