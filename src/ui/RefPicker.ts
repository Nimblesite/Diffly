import type * as vscode from 'vscode';
import { type Result, map } from '../result';
import type { Ref } from '../git/types';
import { showSinglePick } from './runQuickPick';
import type { Cancelled } from './cancelled';
import { refTypeLabel } from './format/refLabel';

interface RefPickItem extends vscode.QuickPickItem {
  readonly ref: Ref;
}

const toItem = (ref: Ref): RefPickItem => ({
  label: ref.name,
  description: ref.sha.slice(0, 7),
  detail: refTypeLabel(ref),
  ref,
});

export const pickRef = async ({
  refs,
  placeholder,
}: {
  refs: readonly Ref[];
  placeholder?: string;
}): Promise<Result<Ref, Cancelled>> => {
  const r = await showSinglePick<RefPickItem>({
    items: refs.map(toItem),
    placeholder: placeholder ?? 'Pick a branch or tag',
    matchOnDescription: true,
    matchOnDetail: true,
  });
  return map(r, (item) => item.ref);
};
