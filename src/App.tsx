import { useState } from 'react';
import {
  DoorOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Ban,
  Info,
  RotateCcw,
  SearchX,
  ShieldAlert,
} from 'lucide-react';
import {
  formatRange,
  formatTime,
  getProposedSlot,
  pad,
  toMinutes,
  type Minutes,
} from '@/lib/availability';
import { ROOMS } from '@/data/rooms';
import {
  applyBlockOverrides,
  filterRooms,
  getEquipmentOptions,
  getRoomStatus,
} from '@/lib/filtering';
import { DEFAULT_NOW, DURATION_OPTIONS, MAX_DURATION_MIN } from '@/lib/constants';
import { FilterPanel } from '@/components/FilterPanel';
import { RoomCard } from '@/components/RoomCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';

const EQUIPMENT_OPTIONS = getEquipmentOptions(ROOMS);

export default function App() {
  const [now] = useState<Minutes>(DEFAULT_NOW);
  const [blockOverrides, setBlockOverrides] = useState<Record<string, boolean>>({});
  const [attendeesInput, setAttendeesInput] = useState('1');
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(ROOMS[0].id);

  const [startHour, setStartHour] = useState(11);
  const [startMinute, setStartMinute] = useState(0);
  const [duration, setDuration] = useState(60);

  const attendees = Math.max(1, Number.parseInt(attendeesInput, 10) || 1);
  const rooms = applyBlockOverrides(ROOMS, blockOverrides);
  const visibleRooms = filterRooms(rooms, { attendees, requiredEquipment });
  const selectedRoom =
    visibleRooms.find((room) => room.id === selectedRoomId) ?? visibleRooms[0] ?? null;

  const start = toMinutes(startHour, startMinute);
  const verdict = selectedRoom ? getRoomStatus(selectedRoom, start, duration, now) : null;
  const proposed = verdict && getProposedSlot(verdict, start, duration);

  const hourOptions = Array.from({ length: 24 }, (_, h) => h);
  const minuteOptions = [0, 15, 30, 45];

  const toggleEquipment = (item: string) =>
    setRequiredEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );

  const resetFilters = () => {
    setAttendeesInput('1');
    setRequiredEquipment([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            <Building2 className="h-3.5 w-3.5 text-sky-600" />
            Smart Campus
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Room Availability Checker
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Check whether a campus room is free for your requested time slot.
            Fictional data — no sign-in required.
          </p>
        </header>

        <FilterPanel
          attendeesInput={attendeesInput}
          onAttendeesChange={setAttendeesInput}
          equipmentOptions={EQUIPMENT_OPTIONS}
          selectedEquipment={requiredEquipment}
          onToggleEquipment={toggleEquipment}
        />

        {/* Room list */}
        {visibleRooms.length === 0 ? (
          <section className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <SearchX className="h-6 w-6" />
            </span>
            <p className="mt-4 text-base font-semibold text-slate-900">
              No rooms match your requirements
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try fewer attendees or fewer equipment requirements.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <RotateCcw className="h-4 w-4" /> Reset filters
            </button>
          </section>
        ) : (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Matching rooms
              </h3>
              <span className="text-xs text-slate-500">
                {visibleRooms.length} of {rooms.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  selected={room.id === selectedRoom?.id}
                  onSelect={() => setSelectedRoomId(room.id)}
                />
              ))}
            </div>
          </section>
        )}

        {selectedRoom && verdict && (
          <>
            {/* Selected room */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <DoorOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold sm:text-lg">{selectedRoom.name}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Capacity {selectedRoom.capacity} · Current time {formatTime(now)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedRoom.bookings.map(({ start: s, end: e }, i) => (
                        <StatusBadge key={i} tone="warning" icon={Clock}>
                          Booked {formatRange(s, e)}
                        </StatusBadge>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setBlockOverrides((prev) => ({
                      ...prev,
                      [selectedRoom.id]: !selectedRoom.blocked,
                    }))
                  }
                  aria-pressed={selectedRoom.blocked}
                  className={`shrink-0 self-start rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    selectedRoom.blocked
                      ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-200'
                      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {selectedRoom.blocked ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Ban className="h-3.5 w-3.5" /> Blocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" /> Mark blocked
                    </span>
                  )}
                </button>
              </div>
            </section>

            {/* Request form */}
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
                Request a slot
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Start hour
                  </span>
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {hourOptions.map((h) => (
                      <option key={h} value={h}>
                        {pad(h)}:00
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Start minute
                  </span>
                  <select
                    value={startMinute}
                    onChange={(e) => setStartMinute(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {minuteOptions.map((m) => (
                      <option key={m} value={m}>
                        :{pad(m)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Duration (min · max {MAX_DURATION_MIN})
                  </span>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Requested slot:{' '}
                <span className="font-medium text-slate-700">
                  {formatRange(start, start + duration)}
                </span>{' '}
                ({duration} min)
              </div>
            </section>

            {/* Timeline */}
            <div className="mb-6">
              <Timeline
                now={now}
                bookings={selectedRoom.bookings}
                proposed={proposed}
                blocked={selectedRoom.blocked}
              />
            </div>

            {/* Verdict */}
            <section
              className={`rounded-2xl border p-5 shadow-sm transition-colors ${
                verdict.kind === 'available'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    verdict.kind === 'available'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {verdict.kind === 'available' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-base font-bold sm:text-lg ${
                      verdict.kind === 'available' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {verdict.kind === 'available' ? 'Available' : 'Unavailable'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 sm:text-base">
                    {verdict.message}
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400">
          Fictional data for demonstration · Now assumed at {formatTime(now)} ·
          Max booking {MAX_DURATION_MIN} min
        </footer>
      </div>
    </div>
  );
}
