import type { Room } from '@/data/rooms';
import { MAX_DURATION_MIN, MINUTES_IN_DAY } from '@/lib/constants';

export type Minutes = number;

export type Range = [Minutes, Minutes];

export type Verdict =
  | { kind: 'available'; message: string }
  | { kind: 'unavailable'; message: string; reason: string };

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function toMinutes(hours: number, minutes: number): Minutes {
  return hours * 60 + minutes;
}

export function formatTime(min: Minutes): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function formatRange(start: Minutes, end: Minutes): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function evaluateBooking(
  start: Minutes,
  duration: number,
  opts: { now: Minutes; room: Room }
): Verdict {
  // AC1: integer minutes, start strictly after now
  if (!Number.isInteger(start) || start < 0 || start > MINUTES_IN_DAY) {
    return {
      kind: 'unavailable',
      message: 'Start time is outside the valid range (00:00 – 24:00).',
      reason: 'invalid-range',
    };
  }
  if (start <= opts.now) {
    return {
      kind: 'unavailable',
      message: `Start time must be strictly after the current time (${formatTime(
        opts.now
      )}). You requested ${formatTime(start)}.`,
      reason: 'past-start',
    };
  }

  // AC2: duration cannot exceed 120 minutes and must be positive
  if (!Number.isInteger(duration) || duration <= 0) {
    return {
      kind: 'unavailable',
      message: 'Duration must be a positive whole number of minutes.',
      reason: 'invalid-duration',
    };
  }
  if (duration > MAX_DURATION_MIN) {
    return {
      kind: 'unavailable',
      message: `Duration of ${duration} min exceeds the ${MAX_DURATION_MIN}-minute limit. Reduce it to ${MAX_DURATION_MIN} min or less.`,
      reason: 'duration-too-long',
    };
  }

  const end = start + duration;
  if (end > MINUTES_IN_DAY) {
    return {
      kind: 'unavailable',
      message: `Booking would end at ${formatTime(end)}, past midnight. Choose an earlier start or shorter duration.`,
      reason: 'past-midnight',
    };
  }

  // AC3: room blocked
  if (opts.room.blocked) {
    return {
      kind: 'unavailable',
      message: 'This room is currently blocked and cannot be booked.',
      reason: 'blocked',
    };
  }

  // AC4: overlap rejects, touching endpoints allowed
  for (const { start: bStart, end: bEnd } of opts.room.bookings) {
    const overlaps = start < bEnd && end > bStart;
    if (overlaps) {
      return {
        kind: 'unavailable',
        message: `Requested slot (${formatRange(start, end)}) overlaps an existing booking (${formatRange(
          bStart,
          bEnd
        )}). Touching endpoints are allowed — try starting at ${formatTime(bEnd)} or later.`,
        reason: 'overlap',
      };
    }
  }

  return {
    kind: 'available',
    message: `Room is available for ${formatRange(start, end)} (${duration} min).`,
  };
}

export function getProposedSlot(
  verdict: Verdict,
  start: Minutes,
  duration: number
): { start: Minutes; end: Minutes } | null {
  const hasTimeOrDurationError =
    verdict.kind === 'unavailable' &&
    (verdict.reason === 'invalid-range' ||
      verdict.reason === 'past-start' ||
      verdict.reason === 'invalid-duration' ||
      verdict.reason === 'past-midnight');
  return hasTimeOrDurationError ? null : { start, end: start + duration };
}
