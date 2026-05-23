import * as vscode from 'vscode';
import type { GitRepo } from '../git/GitRepo';
import type { GitRunner } from '../git/GitRunner';
import type { GitApi } from '../vscodeGitApi';
import type { GitError, CommitRev, RevSpec, Sha } from '../git/types';
import { logger } from '../logger';
import { type Result, err, ok } from '../result';
import { CANCELLED, type Cancelled } from '../ui/cancelled';
import { pickCommit } from '../ui/CommitPicker';
import { pickRef } from '../ui/RefPicker';
import { pickSideBChoice, type SideBChoice } from '../ui/SideBPicker';
import { mergeChangedFilesWithStats, pickFiles } from '../ui/FilePicker';
import type { MementoStore } from '../state';
import { buildRepo, openDiff, pickRepoFrom } from './shared';

export const reportGitError = ({
  output,
  op,
  e,
}: {
  output: vscode.OutputChannel;
  op: string;
  e: GitError;
}): void => {
  logger.error({ op, kind: e.kind }, 'git.error');
  output.appendLine(`Diffy: ${op} failed — ${e.message}`);
  if (e.stderr !== undefined && e.stderr !== '') {
    output.appendLine(e.stderr);
  }
  void vscode.window.showErrorMessage(`Diffy: ${op} failed (see Output → Diffy).`);
};

export const resolveSideB = async ({
  choice,
  repo,
  output,
}: {
  choice: SideBChoice;
  repo: GitRepo;
  output: vscode.OutputChannel;
}): Promise<Result<RevSpec, Cancelled>> => {
  if (choice.kind === 'workingCopy') {
    return ok({ kind: 'workingCopy' });
  }
  if (choice.kind === 'index') {
    return ok({ kind: 'index' });
  }
  if (choice.kind === 'pickRef') {
    return resolveRefAsRev({ repo, output });
  }
  return resolveCommitAsRev({ repo, output });
};

const resolveRefAsRev = async ({
  repo,
  output,
}: {
  repo: GitRepo;
  output: vscode.OutputChannel;
}): Promise<Result<RevSpec, Cancelled>> => {
  const refs = await repo.refs();
  if (!refs.ok) {
    reportGitError({ output, op: 'list refs', e: refs.error });
    return err(CANCELLED);
  }
  const picked = await pickRef({ refs: refs.value });
  if (!picked.ok) {
    return err(CANCELLED);
  }
  const sha = await repo.revParse(picked.value.name);
  if (!sha.ok) {
    reportGitError({ output, op: 'rev-parse', e: sha.error });
    return err(CANCELLED);
  }
  return ok({ kind: 'commit', sha: sha.value });
};

const resolveCommitAsRev = async ({
  repo,
  output,
}: {
  repo: GitRepo;
  output: vscode.OutputChannel;
}): Promise<Result<RevSpec, Cancelled>> => {
  const log = await repo.log({});
  if (!log.ok) {
    reportGitError({ output, op: 'log', e: log.error });
    return err(CANCELLED);
  }
  const picked = await pickCommit({ commits: log.value });
  if (!picked.ok) {
    return err(CANCELLED);
  }
  return ok({ kind: 'commit', sha: picked.value.sha });
};

export const pickSideBAndResolve = async ({
  repo,
  output,
}: {
  repo: GitRepo;
  output: vscode.OutputChannel;
}): Promise<Result<RevSpec, Cancelled>> => {
  const choice = await pickSideBChoice();
  if (!choice.ok) {
    return err(CANCELLED);
  }
  return resolveSideB({ choice: choice.value, repo, output });
};

export const drillIntoFiles = async ({
  repo,
  repoRoot,
  revA,
  revB,
  state,
  output,
}: {
  repo: GitRepo;
  repoRoot: string;
  revA: CommitRev;
  revB: RevSpec;
  state: MementoStore;
  output: vscode.OutputChannel;
}): Promise<void> => {
  const entries = await collectChangedFiles({ repo, revA, revB, output });
  if (entries === undefined) {
    return;
  }
  if (entries.length === 0) {
    void vscode.window.showInformationMessage('Diffy: no changes between selected sides.');
    return;
  }
  await state.setLastComparison({ revA, revB, repoRoot });
  await pickFiles({
    entries,
    onPick: (entry) =>
      openDiff({ revA, revB, repoRoot, relPath: entry.file.path }),
  });
};

const collectChangedFiles = async ({
  repo,
  revA,
  revB,
  output,
}: {
  repo: GitRepo;
  revA: CommitRev;
  revB: RevSpec;
  output: vscode.OutputChannel;
}) => {
  const ns = await repo.nameStatus({ from: revA, to: revB });
  if (!ns.ok) {
    reportGitError({ output, op: 'diff --name-status', e: ns.error });
    return undefined;
  }
  const num = await repo.numstat({ from: revA, to: revB });
  if (!num.ok) {
    reportGitError({ output, op: 'diff --numstat', e: num.error });
    return undefined;
  }
  return mergeChangedFilesWithStats(ns.value, num.value);
};

export const sideAFromSha = (sha: Sha): CommitRev => ({ kind: 'commit', sha });

export interface StartingPoint {
  readonly vsRepoRoot: string;
  readonly repo: GitRepo;
  readonly revA: CommitRev;
}

export const pickRepoAndCommit = async ({
  runner,
  gitApi,
  output,
}: {
  runner: GitRunner;
  gitApi: GitApi;
  output: vscode.OutputChannel;
}): Promise<StartingPoint | undefined> => {
  const vs = await pickRepoFrom(gitApi);
  if (!vs.ok) {
    return undefined;
  }
  const repo = buildRepo(runner, vs.value);
  const log = await repo.log({});
  if (!log.ok) {
    reportGitError({ output, op: 'log', e: log.error });
    return undefined;
  }
  const commit = await pickCommit({ commits: log.value });
  if (!commit.ok) {
    return undefined;
  }
  return {
    vsRepoRoot: vs.value.rootUri.fsPath,
    repo,
    revA: sideAFromSha(commit.value.sha),
  };
};
