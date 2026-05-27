#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const packageJsonPath = resolve(repoRoot, 'package.json');
const menusModulePath = resolve(repoRoot, 'out/menus.js');

const mode = process.argv[2] === '--check' ? 'check' : 'write';

const main = async () => {
  const mod = await import(pathToFileUrl(menusModulePath));
  const manifest = mod.buildMenuManifest();
  const titles = mod.COMMAND_TITLES;
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));

  const desiredCommands = Object.entries(titles).map(([command, title]) => ({
    command,
    title,
  }));

  const desiredMenus = {};
  for (const [menuId, entries] of Object.entries(manifest.menus)) {
    desiredMenus[menuId] = entries.map(({ command, when, group }) => ({
      command,
      when,
      group,
    }));
  }
  desiredMenus.commandPalette = manifest.commandPalette.map(({ command, when }) => ({
    command,
    when,
  }));

  const desiredContributes = {
    ...pkg.contributes,
    commands: desiredCommands,
    menus: desiredMenus,
  };

  const before = JSON.stringify({
    commands: pkg.contributes?.commands,
    menus: pkg.contributes?.menus,
  });
  const after = JSON.stringify({
    commands: desiredContributes.commands,
    menus: desiredContributes.menus,
  });

  if (before === after) {
    process.stdout.write('sync-menus: package.json already in sync\n');
    return;
  }

  if (mode === 'check') {
    process.stderr.write(
      'sync-menus: package.json is out of sync with src/menus.ts.\n' +
        'Run `npm run sync:menus` to regenerate.\n',
    );
    process.exit(1);
  }

  const next = { ...pkg, contributes: desiredContributes };
  await writeFile(packageJsonPath, JSON.stringify(next, null, 2) + '\n');
  process.stdout.write('sync-menus: wrote package.json\n');
};

const pathToFileUrl = (p) => `file://${p}`;

main().catch((e) => {
  process.stderr.write(`sync-menus failed: ${e?.stack ?? String(e)}\n`);
  process.exit(2);
});
