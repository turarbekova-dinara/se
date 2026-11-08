import { describe, expect, it } from 'vitest';
import { ROOMS } from '@/data/rooms';
import { applyBlockOverrides, filterRooms, getEquipmentOptions, getRoomStatus } from '@/lib/filtering';

const idsOf = (rooms: readonly { id: string }[]) => rooms.map((r) => r.id);

describe('F1: capacity must cover attendees', () => {
  it('keeps rooms whose capacity is at least the attendee count', () => {
    expect(idsOf(filterRooms(ROOMS, { attendees: 30, requiredEquipment: [] }))).toEqual([
      'eng-204',
      'annex-12',
      'main-hall',
    ]);
  });

  it('returns an empty array when no room is large enough', () => {
    expect(filterRooms(ROOMS, { attendees: 500, requiredEquipment: [] })).toEqual([]);
  });
});

describe('F2: rooms must have all required equipment', () => {
  it('requires every selected item', () => {
    expect(
      idsOf(filterRooms(ROOMS, { attendees: 1, requiredEquipment: ['projector', 'microphone'] }))
    ).toEqual(['main-hall']);
  });

  it('matches a single item across rooms', () => {
    expect(idsOf(filterRooms(ROOMS, { attendees: 1, requiredEquipment: ['projector'] }))).toEqual([
      'comp-lab-1',
      'main-hall',
    ]);
  });
});

describe('F3: blocked rooms are returned but never reported available', () => {
  it('still includes a matching blocked room in the filter result', () => {
    expect(idsOf(filterRooms(ROOMS, { attendees: 30, requiredEquipment: [] }))).toContain('annex-12');
  });

  it('reports every blocked room as unavailable', () => {
    for (const room of ROOMS.filter((r) => r.blocked)) {
      expect(getRoomStatus(room, 720, 60, 540).kind).toBe('unavailable');
    }
  });
});

describe('F5: status uses only the selected room bookings', () => {
  it('ignores bookings belonging to other rooms', () => {
    const lab = ROOMS.find((r) => r.id === 'comp-lab-1');
    const hall = ROOMS.find((r) => r.id === 'main-hall');
    if (!lab || !hall) throw new Error('fixture missing');
    expect(getRoomStatus(lab, 1020, 60, 540)).toMatchObject({ kind: 'available' });
    expect(getRoomStatus(hall, 1020, 60, 540)).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
  });
});

describe('applyBlockOverrides', () => {
  it('changes only the overridden room and leaves fixtures untouched', () => {
    const result = applyBlockOverrides(ROOMS, { 'eng-204': true, 'annex-12': false });
    expect(result.find((r) => r.id === 'eng-204')?.blocked).toBe(true);
    expect(result.find((r) => r.id === 'annex-12')?.blocked).toBe(false);
    expect(ROOMS.find((r) => r.id === 'eng-204')?.blocked).toBe(false);
    expect(ROOMS.find((r) => r.id === 'annex-12')?.blocked).toBe(true);
  });
});

describe('getEquipmentOptions', () => {
  it('returns a sorted list of unique equipment', () => {
    expect(getEquipmentOptions(ROOMS)).toEqual([
      'computers',
      'microphone',
      'projector',
      'video conferencing',
      'whiteboard',
    ]);
  });
});
