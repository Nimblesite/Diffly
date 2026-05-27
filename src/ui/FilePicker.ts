import type * as vscode from "vscode";
import { showStayOpenPick } from "./runQuickPick";
import { type FileEntry, formatCounts, statusBadge } from "./format/fileItem";

export { mergeChangedFilesWithStats } from "./format/fileItem";
export type { FileEntry } from "./format/fileItem";

interface FileItem extends vscode.QuickPickItem {
  readonly entry: FileEntry;
}

const toItem = (entry: FileEntry): FileItem => ({
  label: entry.file.path,
  description: formatCounts(entry.stat),
  detail: statusBadge(entry.file),
  entry,
});

export const pickFiles = async ({
  entries,
  onPick,
  placeholder,
}: {
  entries: readonly FileEntry[];
  onPick: (entry: FileEntry) => void | Promise<void>;
  placeholder?: string;
}): Promise<void> => {
  await showStayOpenPick<FileItem>(
    {
      items: entries.map(toItem),
      placeholder: placeholder ?? "Pick a file to diff (Esc to close)",
      matchOnDescription: true,
      matchOnDetail: true,
    },
    async (item) => {
      await onPick(item.entry);
    }
  );
};
