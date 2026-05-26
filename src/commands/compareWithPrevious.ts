import * as vscode from "vscode";
import { REV_KINDS, TITLE_PREFIX } from "../constants";
import type { MementoStore } from "../state";
import { extractHistoryItemSha } from "./historyItem";
import { type CommandDeps, buildRepo, pickRepoFrom } from "./shared";
import { drillIntoFiles, reportGitError, sideAFromSha } from "./flow";

const REV_PARSE_PARENT_OP = "rev-parse parent";
const HISTORY_VIEW_WARNING = `${TITLE_PREFIX} this command must be invoked from the SCM history view.`;

const handler = async (deps: CommandDeps & { readonly state: MementoStore }, arg: unknown): Promise<void> => {
  const sha = extractHistoryItemSha(arg);
  if (sha === undefined) {
    void vscode.window.showWarningMessage(HISTORY_VIEW_WARNING);
    return;
  }
  const vs = await pickRepoFrom(deps.gitApi);
  if (!vs.ok) {
    return;
  }
  const repo = buildRepo(deps.runner, vs.value);
  const parent = await repo.revParse(`${sha}^1`);
  if (!parent.ok) {
    reportGitError({
      output: deps.output,
      op: REV_PARSE_PARENT_OP,
      e: parent.error,
    });
    return;
  }
  await drillIntoFiles({
    repo,
    repoRoot: vs.value.rootUri.fsPath,
    revA: sideAFromSha(sha),
    revB: { kind: REV_KINDS.commit, sha: parent.value },
    state: deps.state,
    output: deps.output,
  });
};

export const makeCompareWithPrevious =
  (deps: CommandDeps & { readonly state: MementoStore }) =>
  async (arg: unknown): Promise<void> => {
    await handler(deps, arg);
  };
