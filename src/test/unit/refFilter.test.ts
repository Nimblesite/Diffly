import { strict as assert } from 'node:assert';
import { REF_TYPES } from '../../constants';
import { filterRefs } from '../../ui/format/refFilter';
import type { Ref } from '../../git/types';

const branch = (name: string): Ref => ({
  name,
  fullName: `refs/heads/${name}`,
  sha: `sha-${name}`,
  type: REF_TYPES.branch,
});

const tag = (name: string): Ref => ({
  name,
  fullName: `refs/tags/${name}`,
  sha: `sha-${name}`,
  type: REF_TYPES.tag,
});

const refs: readonly Ref[] = [
  branch('main'),
  branch('agentpmo'),
  branch('feature'),
  tag('v0.1.0'),
  tag('agentpmo'),
];

describe('filterRefs', () => {
  it('returns every ref untouched when no filters supplied', () => {
    const r = filterRefs({ refs });
    assert.equal(r.length, refs.length);
    assert.deepEqual(
      r.map((x) => x.fullName),
      refs.map((x) => x.fullName),
    );
  });

  it('keeps only branches when type=branch', () => {
    const r = filterRefs({ refs, type: REF_TYPES.branch });
    assert.deepEqual(
      r.map((x) => x.name),
      ['main', 'agentpmo', 'feature'],
    );
  });

  it('keeps only tags when type=tag', () => {
    const r = filterRefs({ refs, type: REF_TYPES.tag });
    assert.deepEqual(
      r.map((x) => x.name),
      ['v0.1.0', 'agentpmo'],
    );
  });

  it('excludes the named branch (current HEAD) from the unfiltered list', () => {
    const r = filterRefs({ refs, excludeBranchName: 'agentpmo' });
    assert.equal(
      r.find((x) => x.type === REF_TYPES.branch && x.name === 'agentpmo'),
      undefined,
      'branch named agentpmo must be excluded',
    );
    assert.ok(
      r.find((x) => x.type === REF_TYPES.tag && x.name === 'agentpmo'),
      'tag named agentpmo must NOT be excluded — name collision is fine across ref types',
    );
    assert.deepEqual(
      r.map((x) => x.fullName),
      ['refs/heads/main', 'refs/heads/feature', 'refs/tags/v0.1.0', 'refs/tags/agentpmo'],
    );
  });

  it('excludes the named branch under a branch-type filter (the picker case the user reported)', () => {
    const r = filterRefs({
      refs,
      type: REF_TYPES.branch,
      excludeBranchName: 'agentpmo',
    });
    assert.deepEqual(
      r.map((x) => x.name),
      ['main', 'feature'],
    );
  });

  it('excludeBranchName=undefined is a no-op (detached HEAD case)', () => {
    const r = filterRefs({ refs, type: REF_TYPES.branch, excludeBranchName: undefined });
    assert.deepEqual(
      r.map((x) => x.name),
      ['main', 'agentpmo', 'feature'],
    );
  });

  it('excludeBranchName never removes tags even when the tag name matches', () => {
    const r = filterRefs({
      refs,
      type: REF_TYPES.tag,
      excludeBranchName: 'agentpmo',
    });
    assert.deepEqual(
      r.map((x) => x.name),
      ['v0.1.0', 'agentpmo'],
    );
  });
});
