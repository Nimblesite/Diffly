import * as vscode from "vscode";
import { REV_KINDS, TITLE_PREFIX } from "../constants";
import type { MementoStore } from "../state";
import { historyItemShaFromArgs } from "./historyItem";
import { type CommandDeps, buildRepo, pickRepoFrom } from "./shared";
import { drillIntoFiles, sideAFromSha } from "./flow";

const NOT_FROM_HISTORY = `${TITLE_PREFIX} this command must be invoked from the SCM history view.`;

const handler = async (
  deps: CommandDeps & { readonly state: MementoStore },
  args: readonly unknown[]
): Promise<void> => {
  const sha = historyItemShaFromArgs(args);
  if (sha === undefined) {
    void vscode.window.showWarningMessage(NOT_FROM_HISTORY);
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
    revB: { kind: REV_KINDS.workingCopy },
    state: deps.state,
    output: deps.output,
  });
};

export const makeCompareWithWorkingCopy =
  (deps: CommandDeps & { readonly state: MementoStore }) =>
  async (...args: unknown[]): Promise<void> => {
    await handler(deps, args);
  };
