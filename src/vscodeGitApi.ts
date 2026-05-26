import * as vscode from "vscode";
import { VSCODE_GIT_EXTENSION_ID } from "./constants";

const GIT_API_VERSION = 1;

interface GitExtensionExports {
  getAPI: (version: typeof GIT_API_VERSION) => GitApi;
}

export interface GitVsRepository {
  readonly rootUri: vscode.Uri;
}

export interface GitApi {
  readonly repositories: readonly GitVsRepository[];
  getRepository?: (uri: vscode.Uri) => GitVsRepository | null;
}

export const getGitApi = async (): Promise<GitApi | undefined> => {
  const ext = vscode.extensions.getExtension<GitExtensionExports>(VSCODE_GIT_EXTENSION_ID);
  if (ext === undefined) {
    return undefined;
  }
  if (!ext.isActive) {
    await ext.activate();
  }
  return ext.exports.getAPI(GIT_API_VERSION);
};

export { findRepoForUri } from "./git/repoMatch";
