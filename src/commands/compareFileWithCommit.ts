import type { CommandDeps } from "./shared";
import { FILE_REV_SOURCES, makeCompareFileWithRev } from "./compareFileWithRev";

export const makeCompareFileWithCommit = (deps: CommandDeps) =>
  makeCompareFileWithRev({ deps, source: FILE_REV_SOURCES.commits });
