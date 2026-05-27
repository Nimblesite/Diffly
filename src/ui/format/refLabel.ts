import { REF_TYPES, UI_TEXT } from "../../constants";
import type { Ref } from "../../git/types";

export const refTypeLabel = (ref: Ref): string => {
  if (ref.type === REF_TYPES.branch) {
    return UI_TEXT.branchLabel;
  }
  if (ref.type === REF_TYPES.tag) {
    return UI_TEXT.tagLabel;
  }
  return UI_TEXT.refLabel;
};
