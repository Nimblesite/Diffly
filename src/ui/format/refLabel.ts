import type { Ref } from '../../git/types';

export const refTypeLabel = (ref: Ref): string => {
  if (ref.type === 'branch') {
    return 'Branch';
  }
  if (ref.type === 'tag') {
    return 'Tag';
  }
  return 'Ref';
};
