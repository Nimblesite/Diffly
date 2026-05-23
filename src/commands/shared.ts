import * as path from 'node:path';
import * as vscode from 'vscode';
import { BUILT_IN_COMMANDS, SHORT_SHA_LEN } from '../constants';
import type { GitRepo } from '../git/GitRepo';
import type { GitRunner } from '../git/GitRunner';
import { createGitRepo } from '../git/GitRepo';
import {
  type GitApi,
  type GitVsRepository,
  findRepoForUri,
} from '../vscodeGitApi';
import type { CommitRev, DiffyAddressableRev, RevSpec, Sha } from '../git/types';
import { logger } from '../logger';
import { type Result, err, ok } from '../result';
import { CANCELLED, type Cancelled } from '../ui/cancelled';
import { buildDiffyUri } from '../ui/uri';

export interface CommandDeps {
  readonly runner: GitRunner;
  readonly gitApi: GitApi;
  readonly output: vscode.OutputChannel;
}

export const shortSha = (sha: Sha): string => sha.slice(0, SHORT_SHA_LEN);

const labelForRev = (rev: RevSpec): string => {
  if (rev.kind === 'commit') {
    return shortSha(rev.sha);
  }
  if (rev.kind === 'workingCopy') {
    return 'Working Copy';
  }
  return 'Index';
};

export const formatDiffTitle = ({
  revA,
  revB,
  basename,
}: {
  revA: CommitRev;
  revB: RevSpec;
  basename: string;
}): string => `${labelForRev(revA)} ↔ ${labelForRev(revB)} — ${basename}`;

export const uriForRev = ({
  rev,
  repoRoot,
  relPath,
}: {
  rev: RevSpec;
  repoRoot: string;
  relPath: string;
}): vscode.Uri => {
  if (rev.kind === 'workingCopy') {
    return vscode.Uri.file(path.join(repoRoot, relPath));
  }
  const addressable: DiffyAddressableRev =
    rev.kind === 'commit' ? { kind: 'commit', sha: rev.sha } : { kind: 'index' };
  return vscode.Uri.parse(buildDiffyUri(addressable, relPath));
};

export const openDiff = async ({
  revA,
  revB,
  repoRoot,
  relPath,
}: {
  revA: CommitRev;
  revB: RevSpec;
  repoRoot: string;
  relPath: string;
}): Promise<void> => {
  const left = uriForRev({ rev: revA, repoRoot, relPath });
  const right = uriForRev({ rev: revB, repoRoot, relPath });
  const title = formatDiffTitle({ revA, revB, basename: path.basename(relPath) });
  logger.info({ shaA: shortSha(revA.sha), revBKind: revB.kind }, 'diff.open');
  await vscode.commands.executeCommand(BUILT_IN_COMMANDS.diff, left, right, title);
};

export const repoForUri = (
  api: GitApi,
  uri: vscode.Uri,
): GitVsRepository | undefined => findRepoForUri(api, uri);

export const pickRepoFrom = async (
  api: GitApi,
): Promise<Result<GitVsRepository, Cancelled>> => {
  if (api.repositories.length === 0) {
    return err(CANCELLED);
  }
  const first = api.repositories[0];
  if (api.repositories.length === 1 && first !== undefined) {
    return ok(first);
  }
  const items = api.repositories.map((r) => ({ label: r.rootUri.fsPath, repo: r }));
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Pick a git repository',
  });
  return picked === undefined ? err(CANCELLED) : ok(picked.repo);
};

export const buildRepo = (
  runner: GitRunner,
  vsRepo: GitVsRepository,
): GitRepo => createGitRepo({ runner, cwd: vsRepo.rootUri.fsPath });
