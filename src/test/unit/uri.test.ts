import { strict as assert } from "node:assert";
import { REV_KINDS, URI_PARSE_ERROR_KINDS } from "../../constants";
import { buildDiffyUri, parseDiffyUri } from "../../ui/uri";
import { expectErr, expectOk } from "../../result";
import type { DiffyAddressableRev } from "../../git/types";

const SHA = "abc1234def567890fedcba0987654321aaaaaaaa";

const commit = (sha: string): DiffyAddressableRev => ({
  kind: REV_KINDS.commit,
  sha,
});
const index = (): DiffyAddressableRev => ({ kind: REV_KINDS.index });

const roundTrip = (rev: DiffyAddressableRev, path: string): void => {
  const uri = buildDiffyUri(rev, path);
  const parsed = parseDiffyUri(uri);
  expectOk(parsed);
  assert.deepEqual(parsed.value.rev, rev);
  assert.equal(parsed.value.path, path);
};

describe("buildDiffyUri", () => {
  it("builds a commit URI with sha and path", () => {
    const uri = buildDiffyUri(commit(SHA), "src/file.ts");
    assert.equal(uri, `diffy://commit/${SHA}/src/file.ts`);
  });

  it("builds an index URI without sha", () => {
    const uri = buildDiffyUri(index(), "src/file.ts");
    assert.equal(uri, "diffy://index/src/file.ts");
  });

  it("percent-encodes spaces in path segments", () => {
    const uri = buildDiffyUri(commit(SHA), "a folder/b file.ts");
    assert.equal(uri, `diffy://commit/${SHA}/a%20folder/b%20file.ts`);
  });

  it("percent-encodes ? and # so they are not parsed as query/fragment", () => {
    const uri = buildDiffyUri(commit(SHA), "weird?name#here.ts");
    assert.equal(uri, `diffy://commit/${SHA}/weird%3Fname%23here.ts`);
  });

  it("preserves forward slashes as segment separators", () => {
    const uri = buildDiffyUri(commit(SHA), "a/b/c/d.ts");
    assert.equal(uri, `diffy://commit/${SHA}/a/b/c/d.ts`);
  });

  it("encodes unicode characters in path segments", () => {
    const uri = buildDiffyUri(commit(SHA), "src/日本語.ts");
    const encoded = encodeURIComponent("日本語");
    assert.equal(uri, `diffy://commit/${SHA}/src/${encoded}.ts`);
  });
});

describe("parseDiffyUri", () => {
  it("parses a commit URI and decodes the path", () => {
    const r = parseDiffyUri(`diffy://commit/${SHA}/src/file.ts`);
    expectOk(r);
    assert.deepEqual(r.value.rev, { kind: REV_KINDS.commit, sha: SHA });
    assert.equal(r.value.path, "src/file.ts");
  });

  it("parses an index URI and decodes the path", () => {
    const r = parseDiffyUri("diffy://index/src/file.ts");
    expectOk(r);
    assert.deepEqual(r.value.rev, { kind: REV_KINDS.index });
    assert.equal(r.value.path, "src/file.ts");
  });

  it("rejects a non-diffy scheme", () => {
    const r = parseDiffyUri("file:///some/path.ts");
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.invalidScheme);
  });

  it("rejects an unknown authority", () => {
    const r = parseDiffyUri(`diffy://stash/${SHA}/x.ts`);
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.invalidAuthority);
  });

  it("rejects a commit URI with no path after the sha", () => {
    const r = parseDiffyUri(`diffy://commit/${SHA}/`);
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.emptyPath);
  });

  it("rejects a commit URI with no sha", () => {
    const r = parseDiffyUri("diffy://commit//file.ts");
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.missingSha);
  });

  it("rejects an index URI with no path", () => {
    const r = parseDiffyUri("diffy://index/");
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.emptyPath);
  });

  it("rejects a malformed URI with no scheme separator", () => {
    const r = parseDiffyUri("not-a-uri");
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.malformed);
  });

  it("rejects a URI missing the authority/path slash", () => {
    const r = parseDiffyUri("diffy://commit");
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.malformed);
  });

  it("rejects a URI with malformed percent encoding", () => {
    const r = parseDiffyUri(`diffy://commit/${SHA}/bad%ZZpath.ts`);
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.badEncoding);
  });

  it("rejects an index URI with malformed percent encoding", () => {
    const r = parseDiffyUri("diffy://index/bad%ZZpath.ts");
    expectErr(r);
    assert.equal(r.error.kind, URI_PARSE_ERROR_KINDS.badEncoding);
  });
});

describe("buildDiffyUri ↔ parseDiffyUri round-trip", () => {
  it("round-trips a simple commit URI", () => {
    roundTrip(commit(SHA), "src/file.ts");
  });

  it("round-trips a simple index URI", () => {
    roundTrip(index(), "src/file.ts");
  });

  it("round-trips paths with spaces", () => {
    roundTrip(commit(SHA), "a folder/b file.ts");
    roundTrip(index(), "a folder/b file.ts");
  });

  it("round-trips paths with unicode", () => {
    roundTrip(commit(SHA), "src/日本語/файл.ts");
    roundTrip(index(), "src/日本語/файл.ts");
  });

  it("round-trips paths containing # and ?", () => {
    roundTrip(commit(SHA), "weird?name#here.ts");
    roundTrip(index(), "q=1&r=2#frag.ts");
  });

  it("round-trips paths with quotes and brackets", () => {
    roundTrip(commit(SHA), 'a "b" [c] (d).ts');
  });

  it("round-trips deeply nested paths", () => {
    roundTrip(commit(SHA), "a/b/c/d/e/f/g/h/i/j.ts");
  });
});
