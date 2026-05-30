import { strict as assert } from "node:assert";
import { DEFAULT_LOG_LIMIT, GIT_ERROR_KINDS, REV_KINDS } from "../../constants";
import { createGitRepo } from "../../git/GitRepo";
import type { GitRunArgs, GitRunner } from "../../git/GitRunner";
import type { GitError } from "../../git/types";
import { type Result, err, expectErr, expectOk, ok } from "../../result";

const NUL = "\x00";

// A GitRunner stand-in that records the exact argv it was handed and returns a
// preprogrammed Result. Lets us assert the arg builders (buildLogArgs,
// buildNameStatusArgs, showSpec) without spawning git.
interface RecordingRunner extends GitRunner {
  readonly calls: GitRunArgs[];
}

const fakeRunner = (result: Result<string, GitError>): RecordingRunner => {
  const calls: GitRunArgs[] = [];
  return {
    calls,
    run: async (a: GitRunArgs): Promise<Result<string, GitError>> => {
      calls.push(a);
      return await Promise.resolve(result);
    },
  };
};

// `.at(0)` always yields `GitRunArgs | undefined`, so the existence guard is a
// real (not redundant) condition for both tsc and eslint; after it the call
// narrows to a defined value the test can read directly.
const onlyCall = (runner: RecordingRunner): GitRunArgs => {
  const call = runner.calls.at(0);
  assert.ok(call, "the git runner was invoked exactly once");
  assert.equal(runner.calls.length, 1, "the git runner was invoked exactly once");
  return call;
};

const NONZERO: GitError = {
  kind: GIT_ERROR_KINDS.nonZeroExit,
  message: "git boom",
  stderr: "fatal",
  exitCode: 1,
};

const aliceCommit = {
  sha: "sha1",
  shortSha: "sha1abc",
  author: "Alice",
  authorTime: 1700000000,
  subject: "init",
};
const aliceRecord = `${aliceCommit.sha}${NUL}${aliceCommit.shortSha}${NUL}${aliceCommit.author}${NUL}1700000000${NUL}${aliceCommit.subject}${NUL}`;

describe("createGitRepo.log", () => {
  it("passes the default limit and log format, parsing one commit", async () => {
    const runner = fakeRunner(ok(aliceRecord));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.log();
    expectOk(r);
    assert.deepEqual(r.value, [aliceCommit]);
    const call = onlyCall(runner);
    assert.equal(call.args[0], "log");
    assert.ok(call.args.includes(`--max-count=${DEFAULT_LOG_LIMIT.toString()}`), "default limit is used");
    assert.ok(call.args.includes("-z"), "NUL-delimited output requested");
    assert.equal(call.cwd, "/repo");
  });

  it("appends an explicit ref and honours a custom limit", async () => {
    const runner = fakeRunner(ok(aliceRecord));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.log({ limit: 5, ref: "feature" });
    expectOk(r);
    const call = onlyCall(runner);
    assert.ok(call.args.includes("--max-count=5"), "custom limit forwarded");
    assert.equal(call.args[call.args.length - 1], "feature", "ref is the final argument");
  });

  it("propagates a runner error untouched", async () => {
    const runner = fakeRunner(err(NONZERO));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.log();
    expectErr(r);
    assert.equal(r.error.kind, GIT_ERROR_KINDS.nonZeroExit);
  });
});

describe("createGitRepo.nameStatus", () => {
  const from = { kind: REV_KINDS.commit, sha: "aaa" } as const;

  it("diffs a commit against another commit with both shas", async () => {
    const runner = fakeRunner(ok(`M${NUL}a.txt${NUL}`));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.nameStatus({ from, to: { kind: REV_KINDS.commit, sha: "bbb" } });
    expectOk(r);
    assert.deepEqual(r.value, [{ status: "M", path: "a.txt" }]);
    const { args } = onlyCall(runner);
    assert.ok(args.includes("--name-status"), "name-status requested");
    assert.equal(args[args.length - 2], "aaa");
    assert.equal(args[args.length - 1], "bbb");
  });

  it("diffs a commit against the working copy with a single sha", async () => {
    const runner = fakeRunner(ok(`A${NUL}new.txt${NUL}`));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.nameStatus({ from, to: { kind: REV_KINDS.workingCopy } });
    expectOk(r);
    assert.deepEqual(r.value, [{ status: "A", path: "new.txt" }]);
    const { args } = onlyCall(runner);
    assert.equal(args[args.length - 1], "aaa", "working-copy diff ends with side A only");
    assert.ok(!args.includes("--cached"), "working copy is not the index");
  });

  it("diffs a commit against the index with --cached", async () => {
    const runner = fakeRunner(ok(`D${NUL}gone.txt${NUL}`));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.nameStatus({ from, to: { kind: REV_KINDS.index } });
    expectOk(r);
    assert.deepEqual(r.value, [{ status: "D", path: "gone.txt" }]);
    const { args } = onlyCall(runner);
    assert.equal(args[args.length - 1], "--cached", "index diff is staged against side A");
    assert.equal(args[args.length - 2], "aaa");
  });

  it("propagates a runner error untouched", async () => {
    const runner = fakeRunner(err(NONZERO));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.nameStatus({ from, to: { kind: REV_KINDS.workingCopy } });
    expectErr(r);
    assert.equal(r.error.kind, GIT_ERROR_KINDS.nonZeroExit);
  });
});

describe("createGitRepo.show", () => {
  it("addresses a committed blob as <sha>:<path>", async () => {
    const runner = fakeRunner(ok("file contents"));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.show({ rev: { kind: REV_KINDS.commit, sha: "deadbee" }, path: "dir/a.txt" });
    expectOk(r);
    assert.equal(r.value, "file contents");
    assert.deepEqual(onlyCall(runner).args, ["show", "deadbee:dir/a.txt"]);
  });

  it("addresses an indexed blob as :<path>", async () => {
    const runner = fakeRunner(ok("staged"));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.show({ rev: { kind: REV_KINDS.index }, path: "a.txt" });
    expectOk(r);
    assert.deepEqual(onlyCall(runner).args, ["show", ":a.txt"]);
  });
});

describe("createGitRepo.refs", () => {
  it("parses for-each-ref output into typed refs", async () => {
    const runner = fakeRunner(ok(`refs/heads/main${NUL}main${NUL}abc1234\n`));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.refs();
    expectOk(r);
    assert.deepEqual(r.value, [{ name: "main", fullName: "refs/heads/main", sha: "abc1234", type: "branch" }]);
    assert.equal(onlyCall(runner).args[0], "for-each-ref");
  });

  it("propagates a runner error untouched", async () => {
    const runner = fakeRunner(err(NONZERO));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.refs();
    expectErr(r);
  });
});

describe("createGitRepo.revParse", () => {
  it("trims trailing whitespace from a resolved sha", async () => {
    const runner = fakeRunner(ok("abc123def\n"));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.revParse("HEAD");
    expectOk(r);
    assert.equal(r.value, "abc123def");
    assert.deepEqual(onlyCall(runner).args, ["rev-parse", "--verify", "HEAD"]);
  });

  it("errors when git returns empty output", async () => {
    const runner = fakeRunner(ok("   \n"));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.revParse("bogus");
    expectErr(r);
    assert.equal(r.error.kind, GIT_ERROR_KINDS.parseError);
    assert.match(r.error.message, /empty output/);
  });

  it("propagates a runner error untouched", async () => {
    const runner = fakeRunner(err(NONZERO));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.revParse("HEAD^1");
    expectErr(r);
    assert.equal(r.error.kind, GIT_ERROR_KINDS.nonZeroExit);
  });
});

describe("createGitRepo.currentBranch", () => {
  it("returns the trimmed branch name when on a branch", async () => {
    const runner = fakeRunner(ok("feature\n"));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.currentBranch();
    expectOk(r);
    assert.equal(r.value, "feature");
    assert.deepEqual(onlyCall(runner).args, ["branch", "--show-current"]);
  });

  it("returns undefined for a detached HEAD (empty output)", async () => {
    const runner = fakeRunner(ok("\n"));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.currentBranch();
    expectOk(r);
    assert.equal(r.value, undefined);
  });

  it("propagates a runner error untouched", async () => {
    const runner = fakeRunner(err(NONZERO));
    const repo = createGitRepo({ runner, cwd: "/repo" });
    const r = await repo.currentBranch();
    expectErr(r);
    assert.equal(r.error.kind, GIT_ERROR_KINDS.nonZeroExit);
  });
});
