#!/usr/bin/env node
// Orchestrates unit + E2E test runs, accumulating raw V8 coverage profiles
// into a single temp dir, then asks c8 to render the merged report.
//
// Why a separate script: the unit run is a node-mocha process, and the E2E
// run spawns Electron (extension host). Both write coverage to NODE_V8_COVERAGE
// when it's set in their env. We point both at the same dir, then `c8 report`
// merges the lot.

import { spawnSync } from 'node:child_process';
import { rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const tempDir = resolve(repoRoot, 'coverage', 'tmp');

// On Windows the mocha (Node) and electron-host (Electron) processes write V8
// coverage records with slightly different URL normalizations — backslashes vs
// forward slashes, mixed drive-letter case. c8 keys files by URL, so the same
// physical file ends up reported twice with halved coverage. Rewrite every
// `url` field to a canonical lowercase forward-slash form before c8 merges.
const canonicalUrl = (url) => {
  if (typeof url !== 'string' || !url.startsWith('file://')) {
    return url;
  }
  return url.replace(/\\/g, '/').replace(/^file:\/\/\/?[A-Za-z]:/, (m) => m.toLowerCase());
};

const normalizeCoverageDir = (dir) => {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const path = resolve(dir, name);
    const raw = readFileSync(path, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.result)) continue;
    let changed = false;
    for (const entry of data.result) {
      const next = canonicalUrl(entry.url);
      if (next !== entry.url) {
        entry.url = next;
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(path, JSON.stringify(data));
    }
  }
};

const run = (cmd, args, env) => {
  process.stdout.write(`\n==> ${cmd} ${args.join(' ')}\n`);
  const r = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
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

normalizeCoverageDir(tempDir);

run('npx', ['c8', 'report'], {});
