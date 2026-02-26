import { createRequire } from "node:module";
import { Command } from "commander";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

export type InputMode =
  | { mode: "url"; value: string }
  | { mode: "stdin"; value?: undefined }
  | { mode: "file"; value: string };

export interface CliResult {
  input: InputMode;
  raw: boolean;
  stats: boolean;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("fetchmd")
    .description("Convert any webpage to clean, token-efficient markdown for AI agents")
    .version(pkg.version)
    .argument("[url]", "URL to fetch and convert to markdown")
    .option("-f, --file <path>", "read HTML from a local file")
    .option("-r, --raw", "skip content extraction, convert full HTML")
    .option("-s, --stats", "print word count, token estimate, and size to stderr")
    .addHelpText(
      "after",
      `
Examples:
  fetchmd https://example.com              Fetch and convert a URL
  fetchmd --file page.html                 Convert a local HTML file
  curl -s https://example.com | fetchmd    Pipe HTML from stdin`,
    );

  return program;
}

export function parseArgs(argv: string[], isTTY: boolean): CliResult {
  const program = createProgram();
  program.parse(argv);

  const url = program.args[0] as string | undefined;
  const file = program.opts().file as string | undefined;

  const modes: InputMode[] = [];

  if (url) modes.push({ mode: "url", value: url });
  if (file) modes.push({ mode: "file", value: file });
  if (!url && !file && !isTTY) modes.push({ mode: "stdin" });

  if (modes.length === 0) {
    program.error("Error: No input provided. Pass a URL, use --file, or pipe HTML via stdin.");
  }

  if (modes.length > 1) {
    program.error(
      "Error: Ambiguous input. Provide exactly one of: URL argument, --file, or stdin.",
    );
  }

  return { input: modes[0], raw: !!program.opts().raw, stats: !!program.opts().stats };
}
