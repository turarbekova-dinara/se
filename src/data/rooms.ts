export type Booking = { start: number; end: number };

export type Room = {
  id: string;
  name: string;
  capacity: number;
  equipment: readonly string[];
  blocked: boolean;
  bookings: readonly Booking[];
};

function freezeRoom(room: Room): Room {
  return Object.freeze({
    ...room,
    equipment: Object.freeze([...room.equipment]),
    bookings: Object.freeze(room.bookings.map((b) => Object.freeze({ ...b }))),
  });
}

const ROOM_FIXTURES: Room[] = [
  {
    id: 'eng-204',
    name: 'Engineering Block — Room 204',
    capacity: 40,
    equipment: ['whiteboard', 'video conferencing'],
    blocked: false,
    bookings: [{ start: 600, end: 660 }], // 10:00 – 11:00
  },
  {
    id: 'lib-nook',
    name: 'Library Study Nook',
    capacity: 6,
    equipment: ['whiteboard'],
    blocked: false,
    bookings: [],
  },
  {
    id: 'comp-lab-1',
    name: 'Computing Lab 1',
    capacity: 24,
    equipment: ['projector', 'computers'],
    blocked: false,
    bookings: [{ start: 780, end: 900 }], // 13:00 – 15:00
  },
  {
    id: 'annex-12',
    name: 'Annex Room 12 (under repair)',
    capacity: 30,
    equipment: [],
    blocked: true,
    bookings: [],
  },
  {
    id: 'main-hall',
    name: 'Main Hall',
    capacity: 120,
    equipment: ['projector', 'microphone'],
    blocked: false,
    bookings: [{ start: 1020, end: 1080 }], // 17:00 – 18:00
  },
];

export const ROOMS: readonly Room[] = Object.freeze(ROOM_FIXTURES.map(freezeRoom));
