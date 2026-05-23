import { REF_TYPES } from '../../constants';
import type { Ref, RefType } from '../../git/types';

export interface FilterRefsArgs {
  readonly refs: readonly Ref[];
  readonly type?: RefType | undefined;
  readonly excludeBranchName?: string | undefined;
}

export const filterRefs = ({
  refs,
  type,
  excludeBranchName,
}: FilterRefsArgs): readonly Ref[] => {
  const byType = type === undefined ? refs : refs.filter((r) => r.type === type);
  if (excludeBranchName === undefined) {
    return byType;
  }
  return byType.filter(
    (r) => !(r.type === REF_TYPES.branch && r.name === excludeBranchName),
  );
};
