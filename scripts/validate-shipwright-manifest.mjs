#!/usr/bin/env node
// Shipwright SWR-IDE-* / SWR-VERSION-* manifest gate.
//
// Validates shipwright.json against the canonical schema bundled at
// schemas/shipwright.schema.json. Fails closed: any AJV error blocks CI.
//
// Usage:
//   node scripts/validate-shipwright-manifest.mjs              # validates ./shipwright.json
//   node scripts/validate-shipwright-manifest.mjs path.json    # validates one manifest

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = resolve(repoRoot, 'schemas', 'shipwright.schema.json');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const main = () => {
  const target = process.argv[2] ?? resolve(repoRoot, 'shipwright.json');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(readJson(schemaPath));
  const manifest = readJson(target);
  if (validate(manifest)) {
    process.stdout.write(`${target}: valid\n`);
    return;
  }
  process.stderr.write(`${target}: invalid\n`);
  for (const error of validate.errors ?? []) {
    process.stderr.write(`  ${error.instancePath || '/'} ${error.message ?? ''}\n`);
  }
  process.exit(1);
};

try {
  main();
} catch (error) {
  process.stderr.write(`validate-shipwright-manifest: ${error.message}\n`);
  process.exit(2);
}
