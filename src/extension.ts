import * as vscode from 'vscode';
import {
  COMMAND_IDS,
  CONTEXT_KEYS,
  OUTPUT_CHANNEL_NAME,
} from './constants';
import { createGitRunner } from './git/GitRunner';
import { type GitApi, getGitApi } from './vscodeGitApi';
import { addLogStream, logger } from './logger';
import { makeCompareFileWithCommit } from './commands/compareFileWithCommit';
import { makeCompareTwoCommits } from './commands/compareTwoCommits';
import { makeCompareWith } from './commands/compareWith';
import { makeCompareWithPrevious } from './commands/compareWithPrevious';
import { makeCompareWithWorkingCopy } from './commands/compareWithWorkingCopy';
import { makeReopenLast } from './commands/reopenLast';
import { registerDiffyContentProvider } from './providers/DiffyContentProvider';
import type { CommandDeps } from './commands/shared';
import { buildRepo } from './commands/shared';
import { createMementoStore } from './state';
import type { GitRunner } from './git/GitRunner';

const channelStream = (
  channel: vscode.OutputChannel,
): NodeJS.WritableStream => {
  const stream = {
    write(chunk: string | Uint8Array): boolean {
      const text =
        typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
      channel.appendLine(text.replace(/\n$/, ''));
      return true;
    },
  };
  return stream as NodeJS.WritableStream;
};

const probeGit = async (runner: GitRunner): Promise<boolean> => {
  const r = await runner.run({ args: ['--version'], cwd: process.cwd() });
  return r.ok;
};

const setGitAvailable = async (available: boolean): Promise<void> => {
  await vscode.commands.executeCommand(
    'setContext',
    CONTEXT_KEYS.gitAvailable,
    available,
  );
};

const makeRepoResolver = (
  api: GitApi,
  runner: GitRunner,
) => () => {
  const first = api.repositories[0];
  if (first === undefined) {
    return undefined;
  }
  return buildRepo(runner, first);
};

const registerAll = (
  context: vscode.ExtensionContext,
  deps: CommandDeps & { readonly state: ReturnType<typeof createMementoStore> },
): void => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_IDS.compareWith,
      makeCompareWith(deps),
    ),
    vscode.commands.registerCommand(
      COMMAND_IDS.compareWithWorkingCopy,
      makeCompareWithWorkingCopy(deps),
    ),
    vscode.commands.registerCommand(
      COMMAND_IDS.compareWithPrevious,
      makeCompareWithPrevious(deps),
    ),
    vscode.commands.registerCommand(
      COMMAND_IDS.compareTwoCommits,
      makeCompareTwoCommits(deps),
    ),
    vscode.commands.registerCommand(
      COMMAND_IDS.compareFileWithCommit,
      makeCompareFileWithCommit(deps),
    ),
    vscode.commands.registerCommand(COMMAND_IDS.reopenLast, makeReopenLast(deps)),
    vscode.commands.registerCommand(COMMAND_IDS.showLogs, () => {
      deps.output.show(true);
    }),
  );
};

export const activate = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(output);
  addLogStream({ stream: channelStream(output), level: 'info' });

  const runner = createGitRunner({ logger });
  const gitOk = await probeGit(runner);
  await setGitAvailable(gitOk);
  if (!gitOk) {
    output.appendLine('Diffy: git binary not found on PATH — commands disabled.');
  }

  const api = await getGitApi();
  if (api === undefined) {
    output.appendLine('Diffy: built-in git extension API unavailable.');
    return;
  }

  const state = createMementoStore(context.globalState);
  const deps = { runner, gitApi: api, output, state } as const;
  registerDiffyContentProvider(context, makeRepoResolver(api, runner));
  registerAll(context, deps);
  logger.info({ repos: api.repositories.length }, 'extension.activated');
};

export const deactivate = (): void => {
  logger.info({}, 'extension.deactivated');
};
