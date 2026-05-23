import * as vscode from 'vscode';
import type { MementoStore } from '../state';
import { extractHistoryItemSha } from './historyItem';
import {
  type CommandDeps,
  buildRepo,
  pickRepoFrom,
} from './shared';
import { drillIntoFiles, sideAFromSha } from './flow';

const handler = async (
  deps: CommandDeps & { readonly state: MementoStore },
  arg: unknown,
): Promise<void> => {
  const sha = extractHistoryItemSha(arg);
  if (sha === undefined) {
    void vscode.window.showWarningMessage(
      'Diffy: this command must be invoked from the SCM history view.',
    );
    return;
  }
  const vs = await pickRepoFrom(deps.gitApi);
  if (!vs.ok) {
    return;
  }
  const repo = buildRepo(deps.runner, vs.value);
  await drillIntoFiles({
    repo,
    repoRoot: vs.value.rootUri.fsPath,
    revA: sideAFromSha(sha),
    revB: { kind: 'workingCopy' },
    state: deps.state,
    output: deps.output,
  });
};

export const makeCompareWithWorkingCopy = (
  deps: CommandDeps & { readonly state: MementoStore },
) =>
  async (arg: unknown): Promise<void> => handler(deps, arg);
