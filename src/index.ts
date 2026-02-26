#!/usr/bin/env node

import { run } from "./pipeline.js";

// Handle EPIPE gracefully (e.g., piping to `head`)
process.stdout.on("error", (err) => {
  if ((err as NodeJS.ErrnoException).code === "EPIPE") {
    process.exit(0);
  }
  process.exitCode = 1;
  process.stderr.write(`${err.message}\n`);
});

run(process.argv, !!process.stdin.isTTY).catch((err: Error) => {
  process.exitCode = 1;
  process.stderr.write(`fetchmd: ${err.message}\n`);
});
