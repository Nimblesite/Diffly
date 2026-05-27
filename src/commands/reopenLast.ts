import * as vscode from "vscode";
import { TITLE_PREFIX } from "../constants";
import { findRepoForUri } from "../vscodeGitApi";
import type { MementoStore } from "../state";
import { type CommandDeps, buildRepo } from "./shared";
import { drillIntoFiles } from "./flow";

const NO_PREVIOUS = `${TITLE_PREFIX} no previous comparison to reopen.`;
const REPO_GONE = `${TITLE_PREFIX} previous repository is no longer open.`;

const handler = async (deps: CommandDeps & { readonly state: MementoStore }): Promise<void> => {
  const last = deps.state.getLastComparison();
  if (last === undefined) {
    void vscode.window.showInformationMessage(NO_PREVIOUS);
    return;
  }
  const vsRepo = findRepoForUri(deps.gitApi, vscode.Uri.file(last.repoRoot));
  if (vsRepo === undefined) {
    void vscode.window.showWarningMessage(REPO_GONE);
    return;
  }
  const repo = buildRepo(deps.runner, vsRepo);
  await drillIntoFiles({
    repo,
    repoRoot: vsRepo.rootUri.fsPath,
    revA: last.revA,
    revB: last.revB,
    state: deps.state,
    output: deps.output,
  });
};

export const makeReopenLast = (deps: CommandDeps & { readonly state: MementoStore }) => async (): Promise<void> => {
  await handler(deps);
};
