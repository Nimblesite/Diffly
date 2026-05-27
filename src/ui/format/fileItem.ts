import { CHANGED_FILE_STATUSES, UI_TEXT } from "../../constants";
import type { ChangedFile, DiffStat } from "../../git/types";

export const statusBadge = (file: ChangedFile): string => {
  if (file.status === CHANGED_FILE_STATUSES.renamed) {
    return `${CHANGED_FILE_STATUSES.renamed}${(file.similarity ?? 0).toString()}`;
  }
  if (file.status === CHANGED_FILE_STATUSES.copied) {
    return `${CHANGED_FILE_STATUSES.copied}${(file.similarity ?? 0).toString()}`;
  }
  return file.status;
};

export const formatCounts = (stat: DiffStat): string => {
  if (stat.binary) {
    return UI_TEXT.binaryStat;
  }
  return `+${stat.added.toString()} -${stat.deleted.toString()}`;
};

export interface FileEntry {
  readonly file: ChangedFile;
  readonly stat: DiffStat;
}

export const mergeChangedFilesWithStats = (
  files: readonly ChangedFile[],
  stats: readonly DiffStat[]
): readonly FileEntry[] => {
  const byPath = new Map<string, DiffStat>();
  for (const s of stats) {
    byPath.set(s.path, s);
  }
  return files.map((f) => ({
    file: f,
    stat: byPath.get(f.path) ?? {
      path: f.path,
      added: 0,
      deleted: 0,
      binary: false,
    },
  }));
};
