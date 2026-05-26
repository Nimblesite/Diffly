import * as vscode from "vscode";
import { REV_KINDS, TITLE_PREFIX } from "../constants";
import type { RefType } from "../git/types";
import type { MementoStore } from "../state";
import { extractHistoryItemSha } from "./historyItem";
import { type CommandDeps, buildRepo, pickRepoFrom } from "./shared";
import { drillIntoFiles, pickRefAsSha, sideAFromSha } from "./flow";

const NOT_FROM_HISTORY = `${TITLE_PREFIX} this command must be invoked from the SCM history view.`;

const handler = async ({
  deps,
  arg,
  filter,
}: {
  deps: CommandDeps & { readonly state: MementoStore };
  arg: unknown;
  filter: RefType;
}): Promise<void> => {
  const sha = extractHistoryItemSha(arg);
  if (sha === undefined) {
    void vscode.window.showWarningMessage(NOT_FROM_HISTORY);
    return;
  }
  const vs = await pickRepoFrom(deps.gitApi);
  if (!vs.ok) {
    return;
  }
  const repo = buildRepo(deps.runner, vs.value);
  const target = await pickRefAsSha({ repo, output: deps.output, filter });
  if (!target.ok) {
    return;
  }
  await drillIntoFiles({
    repo,
    repoRoot: vs.value.rootUri.fsPath,
    revA: sideAFromSha(sha),
    revB: { kind: REV_KINDS.commit, sha: target.value },
    state: deps.state,
    output: deps.output,
  });
};

export const makeCompareWithRef =
  ({ deps, filter }: { deps: CommandDeps & { readonly state: MementoStore }; filter: RefType }) =>
  async (arg: unknown): Promise<void> => {
    await handler({ deps, arg, filter });
  };
