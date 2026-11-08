import { describe, expect, it } from 'vitest';
import { ROOMS } from '@/data/rooms';
import { MAX_DURATION_MIN } from '@/lib/constants';
import { applyBlockOverrides, filterRooms, getRoomStatus } from '@/lib/filtering';

const NOW = 540; // 09:00, fixed clock

const idsOf = (rooms: readonly { id: string }[]) => rooms.map((r) => r.id);

function roomById(id: string) {
  const found = ROOMS.find((r) => r.id === id);
  if (!found) throw new Error(`fixture missing: ${id}`);
  return found;
}

describe('Task 2 catalog: at least four fictional rooms with complete data', () => {
  it('has >= 4 rooms, unique ids and every required field', () => {
    expect(ROOMS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(ROOMS.map((r) => r.id)).size).toBe(ROOMS.length);
    for (const r of ROOMS) {
      expect(r.id.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.capacity).toBeGreaterThan(0);
      expect(Array.isArray(r.equipment)).toBe(true);
      expect(typeof r.blocked).toBe('boolean');
      expect(Array.isArray(r.bookings)).toBe(true);
    }
  });
});

describe('F1 boundary: exact capacity vs insufficient capacity', () => {
  it('keeps a 6-seat room for 6 attendees and drops it for 7', () => {
    expect(idsOf(filterRooms(ROOMS, { attendees: 6, requiredEquipment: [] }))).toContain('lib-nook');
    expect(idsOf(filterRooms(ROOMS, { attendees: 7, requiredEquipment: [] }))).not.toContain('lib-nook');
  });

  it('keeps only the 120-seat hall for 120 attendees and nothing for 121', () => {
    expect(idsOf(filterRooms(ROOMS, { attendees: 120, requiredEquipment: [] }))).toEqual(['main-hall']);
    expect(filterRooms(ROOMS, { attendees: 121, requiredEquipment: [] })).toEqual([]);
  });
});

describe('F2: the room must contain ALL selected equipment', () => {
  it('keeps only the room that has both items', () => {
    expect(
      idsOf(filterRooms(ROOMS, { attendees: 1, requiredEquipment: ['whiteboard', 'video conferencing'] }))
    ).toEqual(['eng-204']);
  });

  it('excludes rooms that have only one of the two items', () => {
    expect(filterRooms(ROOMS, { attendees: 1, requiredEquipment: ['whiteboard', 'projector'] })).toEqual([]);
  });
});

describe('F3: a blocked room is never reported as available', () => {
  it('rejects the blocked room even for a valid, free slot', () => {
    expect(getRoomStatus(roomById('annex-12'), 1200, 30, NOW)).toMatchObject({
      kind: 'unavailable',
      reason: 'blocked',
    });
  });

  it('turns an available room unavailable after a block override, without touching the fixture', () => {
    const before = getRoomStatus(roomById('main-hall'), 720, 60, NOW);
    const overridden = applyBlockOverrides(ROOMS, { 'main-hall': true }).find((r) => r.id === 'main-hall');
    if (!overridden) throw new Error('room missing');
    expect(before.kind).toBe('available');
    expect(getRoomStatus(overridden, 720, 60, NOW)).toMatchObject({ kind: 'unavailable', reason: 'blocked' });
    expect(roomById('main-hall').blocked).toBe(false);
  });
});

describe('F4: no matching rooms gives an empty result for the empty state', () => {
  it('returns [] for 200 attendees with a projector', () => {
    expect(filterRooms(ROOMS, { attendees: 200, requiredEquipment: ['projector'] })).toEqual([]);
  });
});

describe('F5: switching the selected room changes the availability result', () => {
  it('10:30 for 60 min overlaps Room 204 but is free in the Library Nook', () => {
    expect(getRoomStatus(roomById('eng-204'), 630, 60, NOW)).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
    expect(getRoomStatus(roomById('lib-nook'), 630, 60, NOW)).toMatchObject({ kind: 'available' });
  });

  it('17:30 for 60 min overlaps the Main Hall but is free in Computing Lab 1', () => {
    expect(getRoomStatus(roomById('main-hall'), 1050, 60, NOW)).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
    expect(getRoomStatus(roomById('comp-lab-1'), 1050, 60, NOW)).toMatchObject({ kind: 'available' });
  });
});

describe('AC2 boundary: exactly 120 vs 121 minutes', () => {
  it('accepts the maximum duration and rejects one minute more', () => {
    const nook = roomById('lib-nook');
    expect(getRoomStatus(nook, 600, MAX_DURATION_MIN, NOW)).toMatchObject({ kind: 'available' });
    expect(getRoomStatus(nook, 600, MAX_DURATION_MIN + 1, NOW)).toMatchObject({
      kind: 'unavailable',
      reason: 'duration-too-long',
    });
  });
});

describe('AC4 boundary: touching vs overlapping (Room 204 booked 10:00-11:00)', () => {
  it('allows slots that only touch at 11:00 (after) or 10:00 (before)', () => {
    const room = roomById('eng-204');
    expect(getRoomStatus(room, 660, 60, NOW)).toMatchObject({ kind: 'available' }); // starts 11:00
    expect(getRoomStatus(room, 541, 59, NOW)).toMatchObject({ kind: 'available' }); // ends 10:00
  });

  it('rejects slots that overlap by a single minute on either side', () => {
    const room = roomById('eng-204');
    expect(getRoomStatus(room, 659, 60, NOW)).toMatchObject({ kind: 'unavailable', reason: 'overlap' }); // starts 10:59
    expect(getRoomStatus(room, 541, 60, NOW)).toMatchObject({ kind: 'unavailable', reason: 'overlap' }); // ends 10:01
  });
});

describe('AC5: booking data is never mutated by evaluation or filtering', () => {
  it('keeps the whole catalog deeply frozen', () => {
    expect(Object.isFrozen(ROOMS)).toBe(true);
    for (const r of ROOMS) {
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.equipment)).toBe(true);
      expect(Object.isFrozen(r.bookings)).toBe(true);
    }
  });

  it('leaves a JSON snapshot of the catalog identical after many evaluations', () => {
    const snapshot = JSON.stringify(ROOMS);
    for (const r of ROOMS) {
      for (const start of [541, 600, 630, 660, 1020, 1380]) {
        getRoomStatus(r, start, 60, NOW);
      }
    }
    filterRooms(ROOMS, { attendees: 10, requiredEquipment: ['projector'] });
    applyBlockOverrides(ROOMS, { 'eng-204': true });
    expect(JSON.stringify(ROOMS)).toBe(snapshot);
  });
});
