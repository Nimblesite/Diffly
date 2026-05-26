import type * as vscode from "vscode";
import { SIDE_B_KINDS, UI_TEXT } from "../constants";
import { type Result, map } from "../result";
import { showSinglePick } from "./runQuickPick";
import type { Cancelled } from "./cancelled";

export type SideBChoice =
  | { readonly kind: typeof SIDE_B_KINDS.workingCopy }
  | { readonly kind: typeof SIDE_B_KINDS.index }
  | { readonly kind: typeof SIDE_B_KINDS.pickRef }
  | { readonly kind: typeof SIDE_B_KINDS.pickCommit };

interface SideBItem extends vscode.QuickPickItem {
  readonly choice: SideBChoice;
}

const ITEMS: readonly SideBItem[] = [
  {
    label: UI_TEXT.workingCopy,
    description: UI_TEXT.workingCopyDescription,
    choice: { kind: SIDE_B_KINDS.workingCopy },
  },
  {
    label: UI_TEXT.indexLabel,
    description: UI_TEXT.indexDescription,
    choice: { kind: SIDE_B_KINDS.index },
  },
  {
    label: UI_TEXT.pickCommitLabel,
    description: UI_TEXT.pickCommitDescription,
    choice: { kind: SIDE_B_KINDS.pickCommit },
  },
  {
    label: UI_TEXT.pickRefLabel,
    description: UI_TEXT.pickRefDescription,
    choice: { kind: SIDE_B_KINDS.pickRef },
  },
];

export const pickSideBChoice = async ({
  placeholder,
}: {
  placeholder?: string;
} = {}): Promise<Result<SideBChoice, Cancelled>> => {
  const r = await showSinglePick<SideBItem>({
    items: ITEMS,
    placeholder: placeholder ?? UI_TEXT.compareAgainstPlaceholder,
  });
  return map(r, (item) => item.choice);
};
