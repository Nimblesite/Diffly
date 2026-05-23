import * as vscode from 'vscode';

interface GitExtensionExports {
  getAPI(version: 1): GitApi;
}

export interface GitVsRepository {
  readonly rootUri: vscode.Uri;
}

export interface GitApi {
  readonly repositories: readonly GitVsRepository[];
  getRepository?(uri: vscode.Uri): GitVsRepository | null;
}

export const getGitApi = async (): Promise<GitApi | undefined> => {
  const ext = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
  if (ext === undefined) {
    return undefined;
  }
  if (!ext.isActive) {
    await ext.activate();
  }
  return ext.exports.getAPI(1);
};

export { findRepoForUri } from './git/repoMatch';
