import * as vscode from 'vscode';
import { type Result, err, ok } from '../result';
import { CANCELLED, type Cancelled } from './cancelled';

export interface QuickPickConfig<T extends vscode.QuickPickItem> {
  readonly items: readonly T[];
  readonly placeholder: string;
  readonly matchOnDescription?: boolean;
  readonly matchOnDetail?: boolean;
  readonly ignoreFocusOut?: boolean;
}

const configurePicker = <T extends vscode.QuickPickItem>(
  qp: vscode.QuickPick<T>,
  config: QuickPickConfig<T>,
): void => {
  qp.placeholder = config.placeholder;
  qp.matchOnDescription = config.matchOnDescription ?? false;
  qp.matchOnDetail = config.matchOnDetail ?? false;
  qp.ignoreFocusOut = config.ignoreFocusOut ?? false;
  qp.items = config.items;
};

export const showSinglePick = <T extends vscode.QuickPickItem>(
  config: QuickPickConfig<T>,
): Promise<Result<T, Cancelled>> => {
  return new Promise<Result<T, Cancelled>>((resolve) => {
    const qp = vscode.window.createQuickPick<T>();
    configurePicker(qp, config);
    let settled = false;
    const finish = (r: Result<T, Cancelled>): void => {
      if (settled) {
        return;
      }
      settled = true;
      qp.dispose();
      resolve(r);
    };
    qp.onDidAccept(() => {
      const choice = qp.selectedItems[0] ?? qp.activeItems[0];
      finish(choice === undefined ? err(CANCELLED) : ok(choice));
    });
    qp.onDidHide(() => {
      finish(err(CANCELLED));
    });
    qp.show();
  });
};

export const showStayOpenPick = <T extends vscode.QuickPickItem>(
  config: QuickPickConfig<T>,
  onPick: (item: T) => void | Promise<void>,
): Promise<void> => {
  return new Promise<void>((resolve) => {
    const qp = vscode.window.createQuickPick<T>();
    configurePicker(qp, { ...config, ignoreFocusOut: true });
    qp.onDidAccept(() => {
      const choice = qp.selectedItems[0] ?? qp.activeItems[0];
      if (choice !== undefined) {
        void Promise.resolve(onPick(choice));
      }
    });
    qp.onDidHide(() => {
      qp.dispose();
      resolve();
    });
    qp.show();
  });
};
