export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;

export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;

export const map = <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E> => (r.ok ? ok(f(r.value)) : r);

export const andThen = <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E> => (r.ok ? f(r.value) : r);

export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T => (r.ok ? r.value : fallback);

export function expectOk<T, E>(r: Result<T, E>): asserts r is Ok<T> {
  if (!r.ok) {
    throw new Error(`expected Ok, got Err: ${JSON.stringify(r.error)}`);
  }
}

export function expectErr<T, E>(r: Result<T, E>): asserts r is Err<E> {
  if (r.ok) {
    throw new Error(`expected Err, got Ok: ${JSON.stringify(r.value)}`);
  }
}
