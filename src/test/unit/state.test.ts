import { strict as assert } from 'node:assert';
import { isLastComparison } from '../../state';

const validRevA = { kind: 'commit', sha: 'abcdef0' };
const validRevB = { kind: 'workingCopy' };

describe('isLastComparison', () => {
  it('accepts a valid record with commit revA + workingCopy revB', () => {
    const value = { revA: validRevA, revB: validRevB, repoRoot: '/path/to/repo' };
    assert.equal(isLastComparison(value), true);
  });

  it('accepts a valid record with two commit revs', () => {
    const value = {
      revA: { kind: 'commit', sha: 'a' },
      revB: { kind: 'commit', sha: 'b' },
      repoRoot: '/path',
    };
    assert.equal(isLastComparison(value), true);
  });

  it('rejects null / undefined / non-object', () => {
    assert.equal(isLastComparison(null), false);
    assert.equal(isLastComparison(undefined), false);
    assert.equal(isLastComparison('string'), false);
    assert.equal(isLastComparison(42), false);
    assert.equal(isLastComparison(true), false);
    assert.equal(isLastComparison([]), false); // arrays are objects but missing fields
  });

  it('rejects a record missing repoRoot', () => {
    const value = { revA: validRevA, revB: validRevB };
    assert.equal(isLastComparison(value), false);
  });

  it('rejects a record where repoRoot is not a string', () => {
    const value = { revA: validRevA, revB: validRevB, repoRoot: 42 };
    assert.equal(isLastComparison(value), false);
  });

  it('rejects a record missing revA', () => {
    const value = { revB: validRevB, repoRoot: '/p' };
    assert.equal(isLastComparison(value), false);
  });

  it('rejects a record where revA is null', () => {
    const value = { revA: null, revB: validRevB, repoRoot: '/p' };
    assert.equal(isLastComparison(value), false);
  });

  it('rejects a record where revA is not an object', () => {
    const value = { revA: 'commit', revB: validRevB, repoRoot: '/p' };
    assert.equal(isLastComparison(value), false);
  });

  it('rejects a record missing revB', () => {
    const value = { revA: validRevA, repoRoot: '/p' };
    assert.equal(isLastComparison(value), false);
  });

  it('rejects a record where revB is null', () => {
    const value = { revA: validRevA, revB: null, repoRoot: '/p' };
    assert.equal(isLastComparison(value), false);
  });

  it('rejects a record where revB is not an object', () => {
    const value = { revA: validRevA, revB: 'workingCopy', repoRoot: '/p' };
    assert.equal(isLastComparison(value), false);
  });
});
