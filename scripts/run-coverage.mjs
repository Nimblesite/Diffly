#!/usr/bin/env node
// Orchestrates unit + E2E test runs, accumulating raw V8 coverage profiles
// into a single temp dir, then asks c8 to render the merged report.
//
// Why a separate script: the unit run is a node-mocha process, and the E2E
// run spawns Electron (extension host). Both write coverage to NODE_V8_COVERAGE
// when it's set in their env. We point both at the same dir, then `c8 report`
// merges the lot.

import { spawnSync } from 'node:child_process';
import { rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tempDir = resolve(repoRoot, 'coverage', 'tmp');

const run = (cmd, args, env) => {
  process.stdout.write(`\n==> ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) {
    process.stderr.write(`\n!! ${cmd} ${args.join(' ')} exited ${r.status ?? '?'}\n`);
    process.exit(r.status ?? 1);
  }
};

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

run('npm', ['run', 'build'], {});

const covEnv = { NODE_V8_COVERAGE: tempDir };
run('npm', ['run', 'test:unit'], covEnv);
run('npm', ['run', 'test:e2e'], covEnv);

run('npx', ['c8', 'report'], {});
