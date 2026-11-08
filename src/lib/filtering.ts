import type { Room } from '@/data/rooms';
import { evaluateBooking, type Minutes, type Verdict } from '@/lib/availability';

export type RoomQuery = {
  attendees: number;
  requiredEquipment: readonly string[];
};

export function applyBlockOverrides(
  rooms: readonly Room[],
  overrides: Readonly<Record<string, boolean>>
): Room[] {
  return rooms.map((room) =>
    overrides[room.id] === undefined ? room : { ...room, blocked: overrides[room.id] }
  );
}

export function filterRooms(rooms: readonly Room[], query: RoomQuery): Room[] {
  return rooms.filter(
    (room) =>
      room.capacity >= query.attendees &&
      query.requiredEquipment.every((item) => room.equipment.includes(item))
  );
}

export function getRoomStatus(
  room: Room,
  start: Minutes,
  duration: number,
  now: Minutes
): Verdict {
  return evaluateBooking(start, duration, { now, room });
}

export function getEquipmentOptions(rooms: readonly Room[]): string[] {
  const unique = new Set(rooms.flatMap((room) => room.equipment));
  return [...unique].sort((a, b) => a.localeCompare(b));
}
