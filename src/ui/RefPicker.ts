import type * as vscode from "vscode";
import { SHORT_SHA_LEN, UI_TEXT } from "../constants";
import { type Result, map } from "../result";
import type { Ref, RefType } from "../git/types";
import { showSinglePick } from "./runQuickPick";
import type { Cancelled } from "./cancelled";
import { refTypeLabel } from "./format/refLabel";
import { filterRefs } from "./format/refFilter";

interface RefPickItem extends vscode.QuickPickItem {
  readonly ref: Ref;
}

const toItem = (ref: Ref): RefPickItem => ({
  label: ref.name,
  description: ref.sha.slice(0, SHORT_SHA_LEN),
  detail: refTypeLabel(ref),
  ref,
});

export const pickRef = async ({
  refs,
  placeholder,
  filter,
  excludeBranchName,
}: {
  refs: readonly Ref[];
  placeholder?: string;
  filter?: RefType | undefined;
  excludeBranchName?: string | undefined;
}): Promise<Result<Ref, Cancelled>> => {
  const items = filterRefs({ refs, type: filter, excludeBranchName }).map(toItem);
  const r = await showSinglePick<RefPickItem>({
    items,
    placeholder: placeholder ?? UI_TEXT.pickRefPlaceholder,
    matchOnDescription: true,
    matchOnDetail: true,
  });
  return map(r, (item) => item.ref);
};
