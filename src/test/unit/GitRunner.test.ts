import { strict as assert } from "node:assert";
import { tmpdir } from "node:os";
import { GIT_ERROR_KINDS } from "../../constants";
import { createGitRunner } from "../../git/GitRunner";
import type { Logger } from "../../logger";
import { expectErr, expectOk } from "../../result";

// A Logger stand-in that records every structured call so we can assert the
// runner logs at the right level without writing to a real pino sink.
interface RecordedLog {
  readonly level: string;
  readonly event: unknown;
}

const recordingLogger = (): { logger: Logger; entries: RecordedLog[] } => {
  const entries: RecordedLog[] = [];
  const at =
    (level: string) =>
    (_fields: object, event?: unknown): void => {
      entries.push({ level, event });
    };
  // Safe: GitRunner only ever calls .debug/.warn with (fields, event); this stub
  // implements exactly those call signatures, so the double cast to pino's Logger
  // is sound for the runner's usage even though it is not a full pino instance.
  const logger = {
    trace: at("trace"),
    debug: at("debug"),
    info: at("info"),
    warn: at("warn"),
    error: at("error"),
  } as unknown as Logger;
  return { logger, entries };
};

describe("createGitRunner.run", () => {
  it("returns ok(stdout) for a zero-exit invocation (git --version)", async () => {
    const { logger, entries } = recordingLogger();
    const runner = createGitRunner({ logger });
    const r = await runner.run({ args: ["--version"], cwd: process.cwd() });
    expectOk(r);
    assert.match(r.value, /git version/);
    assert.ok(
      entries.some((e) => e.level === "debug"),
      "start and end are logged at debug"
    );
  });

  it("returns a nonZeroExit error with stderr and exit code for a failing command", async () => {
    const { logger } = recordingLogger();
    const runner = createGitRunner({ logger });
    // Running a repo subcommand outside any repository exits non-zero.
    const r = await runner.run({ args: ["rev-parse", "--verify", "HEAD"], cwd: tmpdir() });
    expectErr(r);
    assert.equal(r.error.kind, GIT_ERROR_KINDS.nonZeroExit);
    assert.ok(typeof r.error.exitCode === "number" && r.error.exitCode > 0, "carries the non-zero exit code");
    assert.match(r.error.message, /git rev-parse exited/);
  });

  it("returns a spawnFailed error and warns when the binary cannot be executed", async () => {
    const { logger, entries } = recordingLogger();
    const runner = createGitRunner({ logger });
    // A cwd that does not exist makes the child process fail to spawn (ENOENT),
    // which surfaces as the spawnFailed branch rather than a non-zero exit.
    const r = await runner.run({ args: ["--version"], cwd: "/no/such/dir/diffr-spawn-fail" });
    expectErr(r);
    assert.equal(r.error.kind, GIT_ERROR_KINDS.spawnFailed);
    assert.ok(
      entries.some((e) => e.level === "warn"),
      "spawn failure is logged at warn"
    );
  });
});
