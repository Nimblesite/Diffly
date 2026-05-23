import type * as vscode from 'vscode';
import { type Result, map } from '../result';
import type { Commit } from '../git/types';
import { showSinglePick } from './runQuickPick';
import type { Cancelled } from './cancelled';
import { formatRelative } from './format/relativeTime';

interface CommitPickItem extends vscode.QuickPickItem {
  readonly commit: Commit;
}

const toItem = (commit: Commit, now: number): CommitPickItem => ({
  label: commit.shortSha,
  description: commit.subject,
  detail: `${commit.author} • ${formatRelative(commit.authorTime, now)}`,
  commit,
});

export const pickCommit = async ({
  commits,
  placeholder,
  now,
}: {
  commits: readonly Commit[];
  placeholder?: string;
  now?: number;
}): Promise<Result<Commit, Cancelled>> => {
  const tNow = now ?? Math.floor(Date.now() / 1000);
  const r = await showSinglePick<CommitPickItem>({
    items: commits.map((c) => toItem(c, tNow)),
    placeholder: placeholder ?? 'Pick a commit',
    matchOnDescription: true,
    matchOnDetail: true,
  });
  return map(r, (item) => item.commit);
};
