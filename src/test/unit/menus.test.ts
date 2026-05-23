import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMAND_IDS } from '../../constants';
import { COMMAND_TITLES, buildMenuManifest } from '../../menus';

const repoRoot = resolve(__dirname, '..', '..', '..');
const readPackageJson = (): Record<string, unknown> =>
  JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as Record<
    string,
    unknown
  >;

const getContributes = (pkg: Record<string, unknown>): Record<string, unknown> => {
  const c = pkg['contributes'];
  if (typeof c !== 'object' || c === null) {
    throw new Error('package.json: contributes missing');
  }
  return c as Record<string, unknown>;
};

describe('menu manifest — single source of truth', () => {
  it('every COMMAND_ID has a human title in COMMAND_TITLES', () => {
    for (const id of Object.values(COMMAND_IDS)) {
      assert.ok(
        COMMAND_TITLES[id] !== undefined,
        `missing title for command ${id}`,
      );
      assert.match(COMMAND_TITLES[id], /^Diffy: /, `title for ${id} must start with "Diffy: "`);
    }
  });

  it('manifest contributes commands to the four user-discoverable menus', () => {
    const manifest = buildMenuManifest();
    const menuIds = Object.keys(manifest.menus);
    assert.deepEqual(
      menuIds.sort(),
      [
        'editor/title/context',
        'explorer/context',
        'scm/historyItem/context',
        'scm/resourceState/context',
      ],
      'menu IDs must match VSCode contribution points (note: singular scm/historyItem/context)',
    );
  });

  it('SCM history item menu contains all five commit-level Diffy commands', () => {
    const entries = buildMenuManifest().menus['scm/historyItem/context'];
    assert.ok(entries !== undefined);
    const cmds = entries.map((e) => e.command);
    assert.deepEqual(cmds, [
      COMMAND_IDS.compareWith,
      COMMAND_IDS.compareWithWorkingCopy,
      COMMAND_IDS.compareWithPrevious,
      COMMAND_IDS.compareWithBranch,
      COMMAND_IDS.compareWithTag,
    ]);
    for (const e of entries) {
      assert.equal(e.when, 'scmProvider == git');
      assert.match(e.group, /^diffy@\d+$/);
    }
  });

  it('editor/title/context and explorer/context and scm/resourceState/context all expose the three file-level Diffy commands', () => {
    const m = buildMenuManifest().menus;
    const fileLevel = [
      COMMAND_IDS.compareFileWithCommit,
      COMMAND_IDS.compareFileWithBranch,
      COMMAND_IDS.compareFileWithTag,
    ];
    for (const menuId of [
      'editor/title/context',
      'explorer/context',
      'scm/resourceState/context',
    ]) {
      const entries = m[menuId];
      assert.ok(entries !== undefined, `missing ${menuId}`);
      assert.deepEqual(
        entries.map((e) => e.command),
        fileLevel,
        `${menuId} must list the three file-level commands in order`,
      );
    }
  });

  it('commandPalette block hides commit-level entries (they need a history-item arg)', () => {
    const palette = buildMenuManifest().commandPalette;
    const hidden = palette.map((e) => e.command);
    for (const cmd of [
      COMMAND_IDS.compareWith,
      COMMAND_IDS.compareWithWorkingCopy,
      COMMAND_IDS.compareWithPrevious,
      COMMAND_IDS.compareWithBranch,
      COMMAND_IDS.compareWithTag,
      COMMAND_IDS.showLogs,
    ]) {
      assert.ok(hidden.includes(cmd), `${cmd} should be hidden from the palette`);
    }
    for (const e of palette) {
      assert.equal(e.when, 'false');
    }
  });

  it('package.json contributes.menus is byte-equal to what the manifest would write', () => {
    const manifest = buildMenuManifest();
    const pkg = readPackageJson();
    const contributes = getContributes(pkg);

    const pkgMenus = contributes['menus'] as Record<string, unknown>;
    assert.ok(pkgMenus !== undefined, 'package.json missing contributes.menus');

    for (const [menuId, entries] of Object.entries(manifest.menus)) {
      const written = pkgMenus[menuId];
      assert.deepEqual(
        written,
        entries.map((e) => ({ command: e.command, when: e.when, group: e.group })),
        `package.json ${menuId} drifted from src/menus.ts — run 'npm run sync:menus'`,
      );
    }

    assert.deepEqual(
      pkgMenus['commandPalette'],
      manifest.commandPalette.map((e) => ({ command: e.command, when: e.when })),
      'package.json commandPalette block drifted from src/menus.ts',
    );
  });

  it('package.json contributes.commands lists every COMMAND_TITLES entry exactly', () => {
    const pkg = readPackageJson();
    const contributes = getContributes(pkg);
    const cmds = contributes['commands'] as readonly { readonly command: string; readonly title: string }[];
    assert.ok(Array.isArray(cmds));

    const expected = Object.entries(COMMAND_TITLES).map(([command, title]) => ({
      command,
      title,
    }));
    assert.deepEqual(cmds, expected, 'package.json commands drifted — run npm run sync:menus');
  });

  it('package.json declares the contribSourceControlHistoryItemMenu proposed API (required for the commit-row context menu)', () => {
    const pkg = readPackageJson();
    const proposals = pkg['enabledApiProposals'];
    assert.ok(
      Array.isArray(proposals),
      'package.json must declare enabledApiProposals so SCM Graph commit menus actually appear',
    );
    assert.ok(
      (proposals as readonly string[]).includes('contribSourceControlHistoryItemMenu'),
      'enabledApiProposals must include contribSourceControlHistoryItemMenu',
    );
  });
});
