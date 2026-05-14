#!/usr/bin/env node
// Wrapper that unsets ELECTRON_RUN_AS_NODE before spawning the real command.
// Some shell sessions inherit this variable, which forces Electron to behave
// like a plain Node interpreter and breaks `electron-vite dev/preview`.

import { spawn } from 'node:child_process';

if ('ELECTRON_RUN_AS_NODE' in process.env) {
  delete process.env.ELECTRON_RUN_AS_NODE;
}

const [, , cmd, ...args] = process.argv;
if (!cmd) {
  console.error('Usage: node scripts/run.mjs <command> [args...]');
  process.exit(2);
}

const child = spawn(cmd, args, {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (code !== null) process.exit(code);
  if (signal) process.exit(1);
});
