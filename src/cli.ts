import { createRequire } from "node:module";
import { Command } from "commander";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

export type InputMode =
  | { mode: "url"; value: string }
  | { mode: "stdin"; value?: undefined }
  | { mode: "file"; value: string };

export interface CliResult {
  inputs: InputMode[];
  raw: boolean;
  stats: boolean;
  json: boolean;
  render: boolean;
}

function collectFile(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function createProgram(): Command {
  const program = new Command();

  program
    .name("fetchmd")
    .description("Convert any webpage to clean, token-efficient markdown for AI agents")
    .version(pkg.version)
    .argument("[urls...]", "URLs to fetch and convert to markdown")
    .option("-f, --file <path>", "read HTML from a local file (repeatable)", collectFile, [])
    .option("-r, --raw", "skip content extraction, convert full HTML")
    .option("-s, --stats", "print word count, token estimate, and size to stderr")
    .option("-j, --json", "output structured JSON with metadata and stats")
    .option("-R, --render", "render JS-heavy pages in a headless browser (requires Puppeteer)")
    .addHelpText(
      "after",
      `
Examples:
  fetchmd https://example.com              Fetch and convert a URL
  fetchmd --file page.html                 Convert a local HTML file
  curl -s https://example.com | fetchmd    Pipe HTML from stdin
  fetchmd url1 url2 url3                   Convert multiple URLs
  fetchmd --json https://example.com       Output as structured JSON
  fetchmd --render https://spa.example.com Render JS-heavy page first`,
    );

  return program;
}

export function parseArgs(argv: string[], isTTY: boolean): CliResult {
  const program = createProgram();
  program.parse(argv);

  const urls = program.args as string[];
  const files = program.opts().file as string[];

  const inputs: InputMode[] = [];

  for (const url of urls) {
    inputs.push({ mode: "url", value: url });
  }
  for (const file of files) {
    inputs.push({ mode: "file", value: file });
  }

  const hasExplicitInputs = inputs.length > 0;

  if (!hasExplicitInputs && !isTTY) {
    inputs.push({ mode: "stdin" });
  }

  if (inputs.length === 0) {
    program.error("Error: No input provided. Pass a URL, use --file, or pipe HTML via stdin.");
  }

  const hasStdin = inputs.some((i) => i.mode === "stdin");
  if (hasStdin && inputs.length > 1) {
    program.error("Error: stdin cannot be combined with URL or --file inputs.");
  }

  return {
    inputs,
    raw: !!program.opts().raw,
    stats: !!program.opts().stats,
    json: !!program.opts().json,
    render: !!program.opts().render,
  };
}
