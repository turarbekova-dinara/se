import { describe, expect, it } from 'vitest';
import { ROOMS } from '@/data/rooms';
import { DEFAULT_NOW } from '@/lib/constants';
import { getProposedSlot } from '@/lib/availability';
import { applyBlockOverrides, filterRooms, getRoomStatus } from '@/lib/filtering';

/**
 * Integration checks: data -> block overrides -> filtering -> room selection -> availability -> timeline slot.
 * runScenario mirrors the derived state computed in App.tsx (lines 48-56), so these tests exercise
 * the real modules together the same way the screen does.
 */
type Scenario = {
  attendees: number;
  equipment: string[];
  selectedRoomId: string;
  overrides?: Record<string, boolean>;
  start: number;
  duration: number;
};

function runScenario(s: Scenario) {
  const rooms = applyBlockOverrides(ROOMS, s.overrides ?? {});
  const visible = filterRooms(rooms, { attendees: s.attendees, requiredEquipment: s.equipment });
  const selected = visible.find((r) => r.id === s.selectedRoomId) ?? visible[0] ?? null;
  const verdict = selected ? getRoomStatus(selected, s.start, s.duration, DEFAULT_NOW) : null;
  const proposed = verdict ? getProposedSlot(verdict, s.start, s.duration) : null;
  return { visibleIds: visible.map((r) => r.id), selectedId: selected?.id ?? null, verdict, proposed };
}

describe('Integration: filter, select and check availability', () => {
  it('successful filtering: 20 attendees + projector selects Computing Lab 1 and it is available at 11:00', () => {
    const r = runScenario({ attendees: 20, equipment: ['projector'], selectedRoomId: 'eng-204', start: 660, duration: 60 });
    expect(r.visibleIds).toEqual(['comp-lab-1', 'main-hall']);
    expect(r.selectedId).toBe('comp-lab-1');
    expect(r.verdict).toMatchObject({ kind: 'available' });
    expect(r.proposed).toEqual({ start: 660, end: 720 });
  });

  it('unsuccessful filtering: 200 attendees + projector leaves no room, no verdict and no timeline slot', () => {
    const r = runScenario({ attendees: 200, equipment: ['projector'], selectedRoomId: 'eng-204', start: 660, duration: 60 });
    expect(r.visibleIds).toEqual([]);
    expect(r.selectedId).toBeNull();
    expect(r.verdict).toBeNull();
    expect(r.proposed).toBeNull();
  });

  it('room switching: the same 17:00 request is unavailable in the Main Hall and available in Computing Lab 1', () => {
    const base = { attendees: 20, equipment: ['projector'], start: 1020, duration: 60 };
    const hall = runScenario({ ...base, selectedRoomId: 'main-hall' });
    const lab = runScenario({ ...base, selectedRoomId: 'comp-lab-1' });
    expect(hall.verdict).toMatchObject({ kind: 'unavailable', reason: 'overlap' });
    expect(lab.verdict).toMatchObject({ kind: 'available' });
  });

  it('marking a room blocked makes it unavailable, and the catalog stays unchanged', () => {
    const snapshot = JSON.stringify(ROOMS);
    const free = runScenario({ attendees: 1, equipment: [], selectedRoomId: 'eng-204', start: 660, duration: 60 });
    const blocked = runScenario({
      attendees: 1,
      equipment: [],
      selectedRoomId: 'eng-204',
      overrides: { 'eng-204': true },
      start: 660,
      duration: 60,
    });
    expect(free.verdict).toMatchObject({ kind: 'available' });
    expect(blocked.verdict).toMatchObject({ kind: 'unavailable', reason: 'blocked' });
    expect(JSON.stringify(ROOMS)).toBe(snapshot);
  });

  it('when filters hide the selected room, the first matching room is selected', () => {
    const r = runScenario({ attendees: 20, equipment: [], selectedRoomId: 'lib-nook', start: 660, duration: 60 });
    expect(r.visibleIds).not.toContain('lib-nook');
    expect(r.selectedId).toBe('eng-204');
  });

  it('a past start time is rejected with no proposed slot, whichever room is selected', () => {
    const r = runScenario({ attendees: 1, equipment: [], selectedRoomId: 'main-hall', start: 180, duration: 60 });
    expect(r.verdict).toMatchObject({ kind: 'unavailable', reason: 'past-start' });
    expect(r.proposed).toBeNull();
  });
});
