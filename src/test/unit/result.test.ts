import { strict as assert } from 'node:assert';
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  andThen,
  unwrapOr,
  type Result,
} from '../../result';

describe('Result', () => {
  describe('ok / err constructors', () => {
    it('ok wraps the value and discriminates as ok=true', () => {
      const r = ok(42);
      assert.equal(r.ok, true);
      assert.equal(r.value, 42);
    });

    it('err wraps the error and discriminates as ok=false', () => {
      const r = err('boom');
      assert.equal(r.ok, false);
      assert.equal(r.error, 'boom');
    });

    it('ok preserves reference identity of the wrapped value', () => {
      const obj = { x: 1 };
      const r = ok(obj);
      assert.equal(r.ok, true);
      assert.strictEqual(r.value, obj);
    });

    it('err preserves reference identity of the wrapped error', () => {
      const e = new Error('x');
      const r = err(e);
      assert.equal(r.ok, false);
      assert.strictEqual(r.error, e);
    });
  });

  describe('isOk / isErr', () => {
    it('isOk returns true on Ok and false on Err', () => {
      assert.equal(isOk(ok(1)), true);
      assert.equal(isOk(err('x')), false);
    });

    it('isErr returns true on Err and false on Ok', () => {
      assert.equal(isErr(err('x')), true);
      assert.equal(isErr(ok(1)), false);
    });

    it('isOk narrows the union for the compiler (value is accessible)', () => {
      const r: Result<number, string> = ok(7);
      if (isOk(r)) {
        assert.equal(r.value + 1, 8);
      } else {
        assert.fail('expected ok branch');
      }
    });

    it('isErr narrows the union for the compiler (error is accessible)', () => {
      const r: Result<number, string> = err('nope');
      if (isErr(r)) {
        assert.equal(r.error.toUpperCase(), 'NOPE');
      } else {
        assert.fail('expected err branch');
      }
    });
  });

  describe('map', () => {
    it('applies the function on Ok', () => {
      const r = map(ok(2), (n) => n * 3);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, 6);
    });

    it('passes Err through unchanged', () => {
      const original: Result<number, string> = err('bad');
      const r = map<number, number, string>(original, (n) => n * 3);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'bad');
    });

    it('supports type-changing maps', () => {
      const r = map(ok(5), (n) => `n=${n}`);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, 'n=5');
    });
  });

  describe('andThen', () => {
    it('chains Ok into another Ok', () => {
      const r = andThen(ok(2), (n) => ok(n + 1));
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, 3);
    });

    it('chains Ok into an Err and propagates it', () => {
      const start: Result<number, string> = ok(2);
      const r = andThen(start, (_n): Result<number, string> => err('downstream'));
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'downstream');
    });

    it('short-circuits on Err without invoking the function', () => {
      let called = false;
      const start: Result<number, string> = err('upstream');
      const r = andThen(start, (n) => {
        called = true;
        return ok(n);
      });
      assert.equal(called, false);
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'upstream');
    });
  });

  describe('unwrapOr', () => {
    it('returns the Ok value', () => {
      assert.equal(unwrapOr(ok(10), 99), 10);
    });

    it('returns the fallback on Err', () => {
      const r: Result<number, string> = err('x');
      assert.equal(unwrapOr(r, 99), 99);
    });
  });
});
