export interface Cancelled {
  readonly cancelled: true;
}

export const CANCELLED: Cancelled = { cancelled: true };
