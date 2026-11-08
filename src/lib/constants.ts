export const MINUTES_IN_DAY = 1440;
export const MAX_DURATION_MIN = 120;
export const DEFAULT_NOW = 540; // 09:00 AM
export const DURATION_OPTIONS: readonly number[] = Array.from(
  { length: MAX_DURATION_MIN / 30 },
  (_, i) => (i + 1) * 30
);
