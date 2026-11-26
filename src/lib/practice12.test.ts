import { describe, expect, it } from 'vitest';
import { ROOMS } from '@/data/rooms';
import { evaluateBooking } from '@/lib/availability';

const NOW = 540; // fixed clock 09:00
const at = (h: number, m = 0) => h * 60 + m;

function room(id: string) {
  const found = ROOMS.find((r) => r.id === id);
  if (!found) throw new Error(`fixture missing: ${id}`);
  return found;
}

const ROOM_A = room('eng-204'); // booked 10:00-11:00
const ROOM_B = room('annex-12'); // blocked

describe('Practice 12 - shared tests T1-T8 (code-based)', () => {
  it('T1: valid free interval -> Available', () => {
    const v = evaluateBooking(at(11, 30), 60, { now: NOW, room: ROOM_A });
    expect(v.kind).toBe('available');
  });

  it('T2: overlap with an existing booking -> Unavailable (overlap)', () => {
    const v = evaluateBooking(at(10, 30), 60, { now: NOW, room: ROOM_A });
    expect(v).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
  });

  it('T3: blocked room -> Unavailable (blocked)', () => {
    const v = evaluateBooking(at(12), 60, { now: NOW, room: ROOM_B });
    expect(v).toMatchObject({ kind: 'unavailable', reason: 'blocked' });
  });

  it('T4: duration = 0 -> validation error (invalid-duration)', () => {
    const v = evaluateBooking(at(12), 0, { now: NOW, room: ROOM_A });
    expect(v).toMatchObject({ kind: 'unavailable', reason: 'invalid-duration' });
  });

  it('T5: duration = 121 -> validation error (duration-too-long)', () => {
    const v = evaluateBooking(at(12), 121, { now: NOW, room: ROOM_A });
    expect(v).toMatchObject({ kind: 'unavailable', reason: 'duration-too-long' });
  });

  it('T6: past start time -> validation error (past-start)', () => {
    const v = evaluateBooking(at(8), 60, { now: NOW, room: ROOM_A });
    expect(v).toMatchObject({ kind: 'unavailable', reason: 'past-start' });
  });

  it('T7: adjacent non-overlapping interval -> Available', () => {
    const v = evaluateBooking(at(11), 60, { now: NOW, room: ROOM_A });
    expect(v.kind).toBe('available');
  });

  it('T8: booking data unchanged after checks', () => {
    const before = JSON.stringify(ROOMS);
    const cases: Array<[number, number]> = [
      [at(11, 30), 60],
      [at(10, 30), 60],
      [at(12), 0],
      [at(12), 121],
      [at(8), 60],
      [at(11), 60],
    ];
    for (const r of ROOMS) {
      for (const [start, duration] of cases) {
        evaluateBooking(start, duration, { now: NOW, room: r });
      }
    }
    expect(JSON.stringify(ROOMS)).toBe(before);
  });
});