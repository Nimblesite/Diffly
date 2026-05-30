const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v !== "";

const stringIdOf = (obj: object): string | undefined => {
  if (!("id" in obj)) {
    return undefined;
  }
  return isNonEmptyString(obj.id) ? obj.id : undefined;
};

export const extractHistoryItemSha = (arg: unknown): string | undefined => {
  if (isNonEmptyString(arg)) {
    return arg;
  }
  if (typeof arg !== "object" || arg === null) {
    return undefined;
  }
  const direct = stringIdOf(arg);
  if (direct !== undefined) {
    return direct;
  }
  if (!("historyItem" in arg)) {
    return undefined;
  }
  const inner = arg.historyItem;
  if (typeof inner !== "object" || inner === null) {
    return undefined;
  }
  return stringIdOf(inner);
};

// A real SCM history item carries a `parentIds` array alongside its SHA `id`.
// The git SourceControl provider also has an `id` ("git") but NO `parentIds`,
// so `parentIds` is what tells the commit apart from the provider VSCode passes.
const historyItemShaOf = (v: unknown): string | undefined => {
  if (typeof v !== "object" || v === null) {
    return undefined;
  }
  if ("parentIds" in v && Array.isArray(v.parentIds)) {
    return stringIdOf(v);
  }
  if ("historyItem" in v) {
    return historyItemShaOf(v.historyItem);
  }
  return undefined;
};

// VSCode invokes `scm/historyItem/context` commands with MULTIPLE arguments —
// the SourceControl provider (id "git") FIRST, then the history item. Scan for
// the real history item before anything else so the provider's "git" id is never
// fed to git as a revision; fall back to the single-argument shapes used by the
// command palette and older callers.
export const historyItemShaFromArgs = (args: readonly unknown[]): string | undefined => {
  for (const a of args) {
    const sha = historyItemShaOf(a);
    if (sha !== undefined) {
      return sha;
    }
  }
  for (const a of args) {
    const sha = extractHistoryItemSha(a);
    if (sha !== undefined) {
      return sha;
    }
  }
  return undefined;
};
