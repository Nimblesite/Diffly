#!/usr/bin/env node
// Reads the global line-coverage threshold from coverage-thresholds.json
// and delegates to `c8 check-coverage`. Written in Node so the recipe
// works under bash, cmd.exe, and PowerShell on Windows runners.

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const thresholdsPath = resolve(repoRoot, 'coverage-thresholds.json');
const thresholds = JSON.parse(readFileSync(thresholdsPath, 'utf8'));
const threshold = thresholds.default_threshold;

if (typeof threshold !== 'number') {
  process.stderr.write(`coverage-thresholds.json: default_threshold must be a number, got ${typeof threshold}\n`);
  process.exit(1);
}

const r = spawnSync('npx', ['c8', 'check-coverage', '--lines', String(threshold)], {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(r.status ?? 1);
