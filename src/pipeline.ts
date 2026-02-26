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

  const { input } = parseArgs(argv, isTTY);

  const inputOpts: InputOptions = {
    fetch: options?.fetch,
    stdin: options?.stdin as import("node:stream").Readable | undefined,
  };

  const html = await resolveInput(input, inputOpts);

  const urlHint = input.mode === "url" ? input.value : undefined;
  const extracted = extractContent(html, urlHint);

  const markdown = toMarkdown(extracted.content);

  // Prepend title as H1 if available
  let output: string;
  if (extracted.title) {
    output = `# ${extracted.title}\n\n${markdown}`;
  } else {
    output = markdown;
  }

  stdout.write(output);
}
