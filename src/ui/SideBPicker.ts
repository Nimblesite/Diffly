import type * as vscode from 'vscode';
import { type Result, map } from '../result';
import { showSinglePick } from './runQuickPick';
import type { Cancelled } from './cancelled';

export type SideBChoice =
  | { readonly kind: 'workingCopy' }
  | { readonly kind: 'index' }
  | { readonly kind: 'pickRef' }
  | { readonly kind: 'pickCommit' };

interface SideBItem extends vscode.QuickPickItem {
  readonly choice: SideBChoice;
}

const ITEMS: readonly SideBItem[] = [
  {
    label: 'Working Copy',
    description: 'On-disk files in this repository',
    choice: { kind: 'workingCopy' },
  },
  {
    label: 'Index',
    description: 'The git staging area',
    choice: { kind: 'index' },
  },
  {
    label: 'Pick a commit…',
    description: 'Choose from recent log entries',
    choice: { kind: 'pickCommit' },
  },
  {
    label: 'Pick a branch or tag…',
    description: 'Choose from refs in this repository',
    choice: { kind: 'pickRef' },
  },
];

export const pickSideBChoice = async ({
  placeholder,
}: {
  placeholder?: string;
} = {}): Promise<Result<SideBChoice, Cancelled>> => {
  const r = await showSinglePick<SideBItem>({
    items: ITEMS,
    placeholder: placeholder ?? 'Compare against…',
  });
  return map(r, (item) => item.choice);
};
