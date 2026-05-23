import * as vscode from 'vscode';
import { findRepoForUri } from '../vscodeGitApi';
import { pickCommit } from '../ui/CommitPicker';
import {
  type CommandDeps,
  buildRepo,
  openDiff,
} from './shared';
import { reportGitError, sideAFromSha } from './flow';

const resolveTargetUri = (uri?: vscode.Uri): vscode.Uri | undefined => {
  if (uri !== undefined) {
    return uri;
  }
  return vscode.window.activeTextEditor?.document.uri;
};

const handler = async (
  deps: CommandDeps,
  uri: vscode.Uri | undefined,
): Promise<void> => {
  const target = resolveTargetUri(uri);
  if (target === undefined) {
    void vscode.window.showWarningMessage('Diffy: open a file first.');
    return;
  }
  const vsRepo = findRepoForUri(deps.gitApi, target);
  if (vsRepo === undefined) {
    void vscode.window.showWarningMessage('Diffy: file is not in a git repository.');
    return;
  }
  const repo = buildRepo(deps.runner, vsRepo);
  const log = await repo.log({});
  if (!log.ok) {
    reportGitError({ output: deps.output, op: 'log', e: log.error });
    return;
  }
  const commit = await pickCommit({ commits: log.value });
  if (!commit.ok) {
    return;
  }
  await openDiff({
    revA: sideAFromSha(commit.value.sha),
    revB: { kind: 'workingCopy' },
    repoRoot: vsRepo.rootUri.fsPath,
    relPath: vscode.workspace.asRelativePath(target, false),
  });
};

export const makeCompareFileWithCommit = (deps: CommandDeps) =>
  async (uri?: vscode.Uri): Promise<void> => handler(deps, uri);
