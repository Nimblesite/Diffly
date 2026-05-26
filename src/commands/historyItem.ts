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
