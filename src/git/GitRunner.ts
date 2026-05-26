import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { GIT_BINARY, GIT_ERROR_KINDS, LOG_EVENTS } from "../constants";
import { type Result, ok, err } from "../result";
import { logger as defaultLogger, type Logger } from "../logger";
import type { GitError } from "./types";

const UNKNOWN_EXIT_LABEL = "?";
const UNKNOWN_EXIT_CODE = -1;

export interface GitRunArgs {
  readonly args: readonly string[];
  readonly cwd: string;
}

export interface GitRunner {
  run: (args: GitRunArgs) => Promise<Result<string, GitError>>;
}

type Resolver = (r: Result<string, GitError>) => void;

interface WireArgs {
  readonly child: ChildProcessWithoutNullStreams;
  readonly argCount: number;
  readonly subcommand: string;
  readonly logger: Logger;
  readonly resolve: Resolver;
}

const finishRun = (params: {
  code: number | null;
  subcommand: string;
  stdout: string;
  stderr: string;
}): Result<string, GitError> => {
  if (params.code === 0) {
    return ok(params.stdout);
  }
  const codeLabel = params.code === null ? UNKNOWN_EXIT_LABEL : params.code.toString();
  return err({
    kind: GIT_ERROR_KINDS.nonZeroExit,
    message: `git ${params.subcommand} exited ${codeLabel}`,
    stderr: params.stderr,
    exitCode: params.code ?? UNKNOWN_EXIT_CODE,
  });
};

const wireSubprocess = ({ child, argCount, subcommand, logger, resolve }: WireArgs): void => {
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  child.on("error", (e: Error) => {
    logger.warn({ argCount }, LOG_EVENTS.gitRunSpawnFailed);
    resolve(err({ kind: GIT_ERROR_KINDS.spawnFailed, message: e.message }));
  });
  child.on("close", (code: number | null) => {
    logger.debug({ exitCode: code, stdoutLen: stdout.length }, LOG_EVENTS.gitRunEnd);
    resolve(finishRun({ code, subcommand, stdout, stderr }));
  });
};

const runGit = async ({ args, cwd, logger }: GitRunArgs & { logger: Logger }): Promise<Result<string, GitError>> => {
  logger.debug({ argCount: args.length }, LOG_EVENTS.gitRunStart);
  return await new Promise<Result<string, GitError>>((resolve) => {
    const child = spawn(GIT_BINARY, [...args], { cwd });
    wireSubprocess({
      child,
      argCount: args.length,
      subcommand: args[0] ?? "",
      logger,
      resolve,
    });
  });
};

export const createGitRunner = (deps: { logger?: Logger } = {}): GitRunner => {
  const logger = deps.logger ?? defaultLogger;
  return { run: async (a) => await runGit({ ...a, logger }) };
};
