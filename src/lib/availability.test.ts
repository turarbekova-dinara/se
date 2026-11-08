import { describe, expect, it } from 'vitest';
import { evaluateBooking, getProposedSlot, type Range } from '@/lib/availability';

const BOOKINGS: Range[] = [[600, 660]];
const NOW = 540;

function check(start: number, duration: number, overrides: { now?: number; blocked?: boolean; bookings?: Range[] } = {}) {
  return evaluateBooking(start, duration, {
    now: overrides.now ?? NOW,
    room: {
      id: 'test-room',
      name: 'Test room',
      capacity: 1,
      equipment: [],
      blocked: overrides.blocked ?? false,
      bookings: (overrides.bookings ?? []).map(([start, end]) => ({ start, end })),
    },
  });
}

describe('AC1: start must be strictly after the current time', () => {
  it('rejects a start equal to now', () => {
    expect(check(540, 60)).toMatchObject({ kind: 'unavailable', reason: 'past-start' });
  });

  it('rejects a start before now', () => {
    expect(check(539, 60)).toMatchObject({ kind: 'unavailable', reason: 'past-start' });
  });

  it('accepts a start one minute after now', () => {
    expect(check(541, 60)).toMatchObject({ kind: 'available' });
  });

  it('rejects starts outside the day', () => {
    expect(check(-1, 60)).toMatchObject({ kind: 'unavailable', reason: 'invalid-range' });
    expect(check(1441, 60)).toMatchObject({ kind: 'unavailable', reason: 'invalid-range' });
  });

  it('rejects a non-integer start', () => {
    expect(check(600.5, 60)).toMatchObject({ kind: 'unavailable', reason: 'invalid-range' });
  });

  it('rejects a booking that runs past midnight', () => {
    expect(check(1380, 120)).toMatchObject({ kind: 'unavailable', reason: 'past-midnight' });
  });
});

describe('AC2: duration must be a positive whole number no longer than 120 minutes', () => {
  it('rejects zero and negative durations', () => {
    expect(check(600, 0)).toMatchObject({ kind: 'unavailable', reason: 'invalid-duration' });
    expect(check(600, -30)).toMatchObject({ kind: 'unavailable', reason: 'invalid-duration' });
  });

  it('rejects fractional durations', () => {
    expect(check(600, 30.5)).toMatchObject({ kind: 'unavailable', reason: 'invalid-duration' });
  });

  it('rejects durations above 120 minutes', () => {
    expect(check(600, 121)).toMatchObject({ kind: 'unavailable', reason: 'duration-too-long' });
  });

  it('accepts exactly 120 minutes', () => {
    expect(check(600, 120)).toMatchObject({ kind: 'available' });
  });
});

describe('AC3: a blocked room cannot be booked', () => {
  it('rejects a valid slot when the room is blocked', () => {
    expect(check(720, 60, { blocked: true })).toMatchObject({ kind: 'unavailable', reason: 'blocked' });
  });

  it('accepts the same slot when the room is not blocked', () => {
    expect(check(720, 60, { blocked: false })).toMatchObject({ kind: 'available' });
  });
});

describe('AC4: overlapping an existing booking is rejected', () => {
  it('rejects a slot that starts inside an existing booking', () => {
    expect(check(630, 60, { bookings: BOOKINGS })).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
  });

  it('rejects a slot that ends inside an existing booking', () => {
    expect(check(590, 30, { bookings: BOOKINGS })).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
  });

  it('rejects a slot that fully contains an existing booking', () => {
    expect(check(590, 120, { bookings: BOOKINGS })).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
  });

  it('rejects an identical slot', () => {
    expect(check(600, 60, { bookings: BOOKINGS })).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
  });
});

describe('AC4: touching endpoints of an existing booking are allowed', () => {
  it('accepts a slot that starts exactly when a booking ends', () => {
    expect(check(660, 60, { bookings: BOOKINGS })).toMatchObject({ kind: 'available' });
  });

  it('accepts a slot that ends exactly when a booking starts', () => {
    expect(check(540, 60, { now: 480, bookings: BOOKINGS })).toMatchObject({ kind: 'available' });
  });
});

describe('AC6: booking fixtures are not mutated', () => {
  it('leaves the bookings array unchanged across evaluations', () => {
    const bookings: Range[] = Object.freeze([Object.freeze([600, 660])]) as unknown as Range[];
    const snapshot = JSON.stringify(bookings);

    check(630, 60, { bookings });
    check(660, 60, { bookings });
    check(720, 60, { bookings, blocked: true });

    expect(JSON.stringify(bookings)).toBe(snapshot);
  });
});

describe('getProposedSlot', () => {
  it('returns no slot for time or duration errors', () => {
    expect(getProposedSlot(check(539, 60), 539, 60)).toBeNull();
    expect(getProposedSlot(check(600, 0), 600, 0)).toBeNull();
    expect(getProposedSlot(check(1380, 120), 1380, 120)).toBeNull();
  });

  it('returns the requested slot for blocked, overlapping and available verdicts', () => {
    expect(getProposedSlot(check(720, 60, { blocked: true }), 720, 60)).toEqual({ start: 720, end: 780 });
    expect(getProposedSlot(check(630, 60, { bookings: BOOKINGS }), 630, 60)).toEqual({ start: 630, end: 690 });
    expect(getProposedSlot(check(720, 60), 720, 60)).toEqual({ start: 720, end: 780 });
  });
});
