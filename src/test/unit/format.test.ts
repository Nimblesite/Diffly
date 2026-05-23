import { strict as assert } from 'node:assert';
import { formatRelative } from '../../ui/format/relativeTime';
import {
  formatCounts,
  mergeChangedFilesWithStats,
  statusBadge,
} from '../../ui/format/fileItem';
import { refTypeLabel } from '../../ui/format/refLabel';
import type { ChangedFile, DiffStat, Ref } from '../../git/types';

const HOUR = 60 * 60;
const DAY = 24 * HOUR;

describe('formatRelative', () => {
  it('returns "just now" for < 1 minute', () => {
    assert.equal(formatRelative(100, 100), 'just now');
    assert.equal(formatRelative(100, 130), 'just now');
    assert.equal(formatRelative(100, 159), 'just now');
  });

  it('clamps negative deltas (future timestamps) to "just now"', () => {
    assert.equal(formatRelative(200, 100), 'just now');
  });

  it('formats minutes when < 60 min', () => {
    assert.equal(formatRelative(0, 60), '1m ago');
    assert.equal(formatRelative(0, 30 * 60), '30m ago');
    assert.equal(formatRelative(0, 59 * 60), '59m ago');
  });

  it('formats hours when < 24 h', () => {
    assert.equal(formatRelative(0, HOUR), '1h ago');
    assert.equal(formatRelative(0, 12 * HOUR), '12h ago');
    assert.equal(formatRelative(0, 23 * HOUR), '23h ago');
  });

  it('formats days for older timestamps', () => {
    assert.equal(formatRelative(0, DAY), '1d ago');
    assert.equal(formatRelative(0, 7 * DAY), '7d ago');
    assert.equal(formatRelative(0, 365 * DAY), '365d ago');
  });
});

describe('statusBadge', () => {
  it('returns single letter for A/M/D', () => {
    assert.equal(statusBadge({ status: 'A', path: 'x' } as ChangedFile), 'A');
    assert.equal(statusBadge({ status: 'M', path: 'x' } as ChangedFile), 'M');
    assert.equal(statusBadge({ status: 'D', path: 'x' } as ChangedFile), 'D');
  });

  it('appends similarity for R', () => {
    const r: ChangedFile = {
      status: 'R',
      path: 'new',
      oldPath: 'old',
      similarity: 87,
    };
    assert.equal(statusBadge(r), 'R87');
  });

  it('appends similarity for C', () => {
    const c: ChangedFile = {
      status: 'C',
      path: 'dst',
      oldPath: 'src',
      similarity: 100,
    };
    assert.equal(statusBadge(c), 'C100');
  });

  it('falls back to 0 when similarity is missing on R/C', () => {
    const r = { status: 'R', path: 'new', oldPath: 'old' } as ChangedFile;
    assert.equal(statusBadge(r), 'R0');
    const c = { status: 'C', path: 'dst', oldPath: 'src' } as ChangedFile;
    assert.equal(statusBadge(c), 'C0');
  });
});

describe('formatCounts', () => {
  it('formats numeric +N -M for non-binary stats', () => {
    const s: DiffStat = { path: 'x', added: 12, deleted: 3, binary: false };
    assert.equal(formatCounts(s), '+12 -3');
  });

  it('reports "binary" for binary stats', () => {
    const s: DiffStat = { path: 'x', added: 0, deleted: 0, binary: true };
    assert.equal(formatCounts(s), 'binary');
  });

  it('reports 0/0 cleanly when there are no changes', () => {
    const s: DiffStat = { path: 'x', added: 0, deleted: 0, binary: false };
    assert.equal(formatCounts(s), '+0 -0');
  });
});

describe('mergeChangedFilesWithStats', () => {
  it('joins by path', () => {
    const files: ChangedFile[] = [{ status: 'M', path: 'a.txt' }];
    const stats: DiffStat[] = [{ path: 'a.txt', added: 2, deleted: 1, binary: false }];
    const r = mergeChangedFilesWithStats(files, stats);
    assert.equal(r.length, 1);
    assert.deepEqual(r[0], { file: files[0], stat: stats[0] });
  });

  it('falls back to zero stats when no matching numstat row exists', () => {
    const files: ChangedFile[] = [{ status: 'A', path: 'new.txt' }];
    const r = mergeChangedFilesWithStats(files, []);
    assert.equal(r.length, 1);
    assert.deepEqual(r[0]?.stat, {
      path: 'new.txt',
      added: 0,
      deleted: 0,
      binary: false,
    });
  });

  it('preserves order from the name-status list', () => {
    const files: ChangedFile[] = [
      { status: 'M', path: 'b' },
      { status: 'M', path: 'a' },
    ];
    const stats: DiffStat[] = [
      { path: 'a', added: 1, deleted: 1, binary: false },
      { path: 'b', added: 2, deleted: 2, binary: false },
    ];
    const r = mergeChangedFilesWithStats(files, stats);
    assert.equal(r[0]?.file.path, 'b');
    assert.equal(r[1]?.file.path, 'a');
  });

  it('handles rename entries (new path differs from old)', () => {
    const files: ChangedFile[] = [
      { status: 'R', path: 'b2.txt', oldPath: 'b.txt', similarity: 100 },
    ];
    const stats: DiffStat[] = [
      { path: 'b2.txt', oldPath: 'b.txt', added: 1, deleted: 0, binary: false },
    ];
    const r = mergeChangedFilesWithStats(files, stats);
    assert.equal(r[0]?.stat.added, 1);
    assert.equal(r[0]?.stat.oldPath, 'b.txt');
  });
});

describe('refTypeLabel', () => {
  it('returns "Branch" for branches', () => {
    const r: Ref = { name: 'main', fullName: 'refs/heads/main', sha: 'a', type: 'branch' };
    assert.equal(refTypeLabel(r), 'Branch');
  });

  it('returns "Tag" for tags', () => {
    const r: Ref = { name: 'v1', fullName: 'refs/tags/v1', sha: 'a', type: 'tag' };
    assert.equal(refTypeLabel(r), 'Tag');
  });

  it('returns "Ref" for other ref kinds', () => {
    const r: Ref = {
      name: 'origin/main',
      fullName: 'refs/remotes/origin/main',
      sha: 'a',
      type: 'other',
    };
    assert.equal(refTypeLabel(r), 'Ref');
  });
});
