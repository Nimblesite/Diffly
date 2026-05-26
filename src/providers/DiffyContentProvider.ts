import * as vscode from "vscode";
import { LOG_EVENTS, SCHEME } from "../constants";
import type { GitRepo } from "../git/GitRepo";
import { logger } from "../logger";
import { parseDiffyUri } from "../ui/uri";

export class DiffyContentProvider implements vscode.TextDocumentContentProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();

  readonly onDidChange: vscode.Event<vscode.Uri> = this.emitter.event;

  constructor(private readonly resolveRepo: (uri: vscode.Uri) => GitRepo | undefined) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const parsed = parseDiffyUri(uri.toString());
    if (!parsed.ok) {
      logger.warn({ kind: parsed.error.kind }, LOG_EVENTS.providerParseFailed);
      return "";
    }
    const repo = this.resolveRepo(uri);
    if (repo === undefined) {
      logger.warn({}, LOG_EVENTS.providerRepoUnresolved);
      return "";
    }
    const r = await repo.show({ rev: parsed.value.rev, path: parsed.value.path });
    if (!r.ok) {
      logger.debug({ kind: r.error.kind }, LOG_EVENTS.providerShowFailed);
      return "";
    }
    return r.value;
  }

  dispose(): void {
    this.emitter.dispose();
  }
}

export const registerDiffyContentProvider = (
  context: vscode.ExtensionContext,
  resolver: (uri: vscode.Uri) => GitRepo | undefined
): DiffyContentProvider => {
  const provider = new DiffyContentProvider(resolver);
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(SCHEME, provider), provider);
  return provider;
};
