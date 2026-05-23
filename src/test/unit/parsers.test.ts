import { strict as assert } from 'node:assert';
import {
  parseLog,
  parseNameStatus,
  parseNumstat,
  parseRefs,
} from '../../git/parsers';

const NUL = '\x00';
const TAB = '\t';

const logRecord = (
  sha: string,
  short: string,
  author: string,
  at: string,
  subject: string,
): string => [sha, short, author, at, subject].join(NUL);

describe('parseLog', () => {
  it('returns empty array for empty input', () => {
    const r = parseLog('');
    assert.equal(r.ok, true);
    if (r.ok) {assert.deepEqual(r.value, []);}
  });

  it('parses a single commit with trailing NUL', () => {
    const stdout = logRecord('abc123def456', 'abc123d', 'Alice', '1700000000', 'init') + NUL;
    const r = parseLog(stdout);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value.length, 1);
    assert.deepEqual(r.value[0], {
      sha: 'abc123def456',
      shortSha: 'abc123d',
      author: 'Alice',
      authorTime: 1700000000,
      subject: 'init',
    });
  });

  it('parses two commits separated by NUL', () => {
    const a = logRecord('aaaa1111', 'aaaa111', 'Alice', '1700000000', 'first');
    const b = logRecord('bbbb2222', 'bbbb222', 'Bob', '1700000100', 'second commit');
    const r = parseLog(`${a}${NUL}${b}${NUL}`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value.length, 2);
    assert.equal(r.value[0]?.sha, 'aaaa1111');
    assert.equal(r.value[0]?.subject, 'first');
    assert.equal(r.value[1]?.sha, 'bbbb2222');
    assert.equal(r.value[1]?.subject, 'second commit');
    assert.equal(r.value[1]?.author, 'Bob');
    assert.equal(r.value[1]?.authorTime, 1700000100);
  });

  it('parses without trailing NUL when field count matches', () => {
    const stdout = logRecord('abcd1234', 'abcd123', 'Alice', '1700000000', 'init');
    const r = parseLog(stdout);
    assert.equal(r.ok, true);
    if (r.ok) {assert.equal(r.value.length, 1);}
  });

  it('preserves an empty subject', () => {
    const stdout = logRecord('abcd1234', 'abcd123', 'Alice', '1700000000', '') + NUL;
    const r = parseLog(stdout);
    assert.equal(r.ok, true);
    if (r.ok) {assert.equal(r.value[0]?.subject, '');}
  });

  it('preserves unicode and spaces in author/subject', () => {
    const stdout =
      logRecord('abcd1234', 'abcd123', 'Élise Müller', '1700000000', 'feat: 日本語 fix ⚡') + NUL;
    const r = parseLog(stdout);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value[0]?.author, 'Élise Müller');
    assert.equal(r.value[0]?.subject, 'feat: 日本語 fix ⚡');
  });

  it('errors when field count is not a multiple of 5', () => {
    const r = parseLog(`a${NUL}b${NUL}c${NUL}d${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.kind, 'parseError');
      assert.match(r.error.message, /multiple of 5/);
    }
  });

  it('errors when timestamp is not numeric', () => {
    const stdout = logRecord('a', 'a', 'Alice', 'NOT_A_NUMBER', 'x') + NUL;
    const r = parseLog(stdout);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /timestamp/);}
  });

  it('errors when timestamp is empty', () => {
    const stdout = logRecord('a', 'a', 'Alice', '', 'x') + NUL;
    const r = parseLog(stdout);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /timestamp/);}
  });

  it('errors when timestamp has leading/trailing whitespace', () => {
    const stdout = logRecord('a', 'a', 'Alice', ' 1700000000', 'x') + NUL;
    const r = parseLog(stdout);
    assert.equal(r.ok, false);
  });
});

describe('parseNameStatus', () => {
  it('returns empty array for empty input', () => {
    const r = parseNameStatus('');
    assert.equal(r.ok, true);
    if (r.ok) {assert.deepEqual(r.value, []);}
  });

  it('parses an Added file', () => {
    const r = parseNameStatus(`A${NUL}new.txt${NUL}`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.deepEqual(r.value, [{ status: 'A', path: 'new.txt' }]);
  });

  it('parses a Modified file', () => {
    const r = parseNameStatus(`M${NUL}a.txt${NUL}`);
    assert.equal(r.ok, true);
    if (r.ok) {assert.deepEqual(r.value, [{ status: 'M', path: 'a.txt' }]);}
  });

  it('parses a Deleted file', () => {
    const r = parseNameStatus(`D${NUL}gone.txt${NUL}`);
    assert.equal(r.ok, true);
    if (r.ok) {assert.deepEqual(r.value, [{ status: 'D', path: 'gone.txt' }]);}
  });

  it('parses a Rename with similarity', () => {
    const r = parseNameStatus(`R100${NUL}old.txt${NUL}new.txt${NUL}`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.deepEqual(r.value, [
      { status: 'R', path: 'new.txt', oldPath: 'old.txt', similarity: 100 },
    ]);
  });

  it('parses a Copy with similarity', () => {
    const r = parseNameStatus(`C75${NUL}src.txt${NUL}dst.txt${NUL}`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.deepEqual(r.value, [
      { status: 'C', path: 'dst.txt', oldPath: 'src.txt', similarity: 75 },
    ]);
  });

  it('parses a mixed batch', () => {
    const stdout =
      `A${NUL}added.txt${NUL}` +
      `M${NUL}modified.txt${NUL}` +
      `D${NUL}deleted.txt${NUL}` +
      `R98${NUL}was.txt${NUL}now.txt${NUL}` +
      `C50${NUL}src.txt${NUL}dst.txt${NUL}`;
    const r = parseNameStatus(stdout);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value.length, 5);
    assert.equal(r.value[0]?.status, 'A');
    assert.equal(r.value[1]?.status, 'M');
    assert.equal(r.value[2]?.status, 'D');
    assert.equal(r.value[3]?.status, 'R');
    assert.equal(r.value[3]?.similarity, 98);
    assert.equal(r.value[4]?.status, 'C');
    assert.equal(r.value[4]?.similarity, 50);
  });

  it('preserves spaces, unicode, and quotes in paths', () => {
    const stdout = `M${NUL}path with spaces/日本語 "name".txt${NUL}`;
    const r = parseNameStatus(stdout);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value[0]?.path, 'path with spaces/日本語 "name".txt');
  });

  it('errors on unknown status letter', () => {
    const r = parseNameStatus(`X${NUL}a.txt${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /unknown status/);}
  });

  it('errors when A/M/D has trailing chars', () => {
    const r = parseNameStatus(`A100${NUL}a.txt${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /extra chars/);}
  });

  it('errors on rename without similarity digits', () => {
    const r = parseNameStatus(`R${NUL}old${NUL}new${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /similarity/);}
  });

  it('errors on rename with non-digit similarity', () => {
    const r = parseNameStatus(`R1x0${NUL}old${NUL}new${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /similarity/);}
  });

  it('errors on truncated rename (missing new path)', () => {
    const r = parseNameStatus(`R100${NUL}old.txt${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /missing paths/);}
  });

  it('errors when simple status is missing its path', () => {
    const r = parseNameStatus(`M${NUL}`);
    assert.equal(r.ok, false);
  });
});

describe('parseNumstat', () => {
  it('returns empty array for empty input', () => {
    const r = parseNumstat('');
    assert.equal(r.ok, true);
    if (r.ok) {assert.deepEqual(r.value, []);}
  });

  it('parses a regular numstat record', () => {
    const r = parseNumstat(`12${TAB}3${TAB}hello.txt${NUL}`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.deepEqual(r.value, [
      { path: 'hello.txt', added: 12, deleted: 3, binary: false },
    ]);
  });

  it('parses a binary marker ("-" / "-")', () => {
    const r = parseNumstat(`-${TAB}-${TAB}image.png${NUL}`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.deepEqual(r.value, [
      { path: 'image.png', added: 0, deleted: 0, binary: true },
    ]);
  });

  it('parses a rename record', () => {
    const r = parseNumstat(`3${TAB}1${TAB}${NUL}old.txt${NUL}new.txt${NUL}`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value.length, 1);
    assert.deepEqual(r.value[0], {
      path: 'new.txt',
      oldPath: 'old.txt',
      added: 3,
      deleted: 1,
      binary: false,
    });
  });

  it('parses a mixed batch with regular, binary, and rename', () => {
    const stdout =
      `2${TAB}1${TAB}a.txt${NUL}` +
      `-${TAB}-${TAB}logo.png${NUL}` +
      `5${TAB}0${TAB}${NUL}old.txt${NUL}new.txt${NUL}`;
    const r = parseNumstat(stdout);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value.length, 3);
    assert.equal(r.value[0]?.path, 'a.txt');
    assert.equal(r.value[0]?.binary, false);
    assert.equal(r.value[1]?.binary, true);
    assert.equal(r.value[2]?.path, 'new.txt');
    assert.equal(r.value[2]?.oldPath, 'old.txt');
  });

  it('preserves spaces and unicode in paths', () => {
    const r = parseNumstat(`1${TAB}1${TAB}dir with spaces/日本語.txt${NUL}`);
    assert.equal(r.ok, true);
    if (r.ok) {assert.equal(r.value[0]?.path, 'dir with spaces/日本語.txt');}
  });

  it('errors when tab count is wrong', () => {
    const r = parseNumstat(`1${TAB}2${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /3 tab-fields/);}
  });

  it('errors when counts are non-numeric (and not binary marker)', () => {
    const r = parseNumstat(`abc${TAB}def${TAB}p${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /non-numeric/);}
  });

  it('errors on truncated rename', () => {
    const r = parseNumstat(`3${TAB}1${TAB}${NUL}old.txt${NUL}`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /rename missing paths/);}
  });
});

describe('parseRefs', () => {
  it('returns empty array for empty input', () => {
    const r = parseRefs('');
    assert.equal(r.ok, true);
    if (r.ok) {assert.deepEqual(r.value, []);}
  });

  it('parses a branch ref (newline-terminated record)', () => {
    const r = parseRefs(`refs/heads/main${NUL}main${NUL}abc1234\n`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.deepEqual(r.value, [
      { name: 'main', fullName: 'refs/heads/main', sha: 'abc1234', type: 'branch' },
    ]);
  });

  it('parses a tag ref', () => {
    const r = parseRefs(`refs/tags/v1.0${NUL}v1.0${NUL}def5678\n`);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.deepEqual(r.value, [
      { name: 'v1.0', fullName: 'refs/tags/v1.0', sha: 'def5678', type: 'tag' },
    ]);
  });

  it('classifies a non-branch, non-tag ref as other', () => {
    const r = parseRefs(`refs/remotes/origin/main${NUL}origin/main${NUL}abc1234\n`);
    assert.equal(r.ok, true);
    if (r.ok) {assert.equal(r.value[0]?.type, 'other');}
  });

  it('parses a mixed batch of branches and tags', () => {
    const stdout =
      `refs/heads/main${NUL}main${NUL}aaa\n` +
      `refs/heads/dev${NUL}dev${NUL}bbb\n` +
      `refs/tags/v1.0${NUL}v1.0${NUL}ccc\n`;
    const r = parseRefs(stdout);
    assert.equal(r.ok, true);
    if (!r.ok) {return;}
    assert.equal(r.value.length, 3);
    assert.equal(r.value[0]?.type, 'branch');
    assert.equal(r.value[1]?.type, 'branch');
    assert.equal(r.value[2]?.type, 'tag');
  });

  it('errors when a line has fewer than 3 NUL-separated fields', () => {
    const r = parseRefs(`refs/heads/main${NUL}main\n`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /3 NUL-separated/);}
  });

  it('errors when a ref field is empty', () => {
    const r = parseRefs(`refs/heads/main${NUL}${NUL}abc\n`);
    assert.equal(r.ok, false);
    if (!r.ok) {assert.match(r.error.message, /empty field/);}
  });

  it('ignores trailing blank lines', () => {
    const r = parseRefs(`refs/heads/main${NUL}main${NUL}abc\n\n\n`);
    assert.equal(r.ok, true);
    if (r.ok) {assert.equal(r.value.length, 1);}
  });
});
