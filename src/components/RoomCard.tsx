import { Ban } from 'lucide-react';
import type { Room } from '@/data/rooms';
import { StatusBadge } from '@/components/StatusBadge';

export function RoomCard({
  room,
  selected,
  onSelect,
}: {
  room: Room;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        selected ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-slate-900">{room.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">Capacity {room.capacity}</p>
        </div>
        {room.blocked && (
          <StatusBadge tone="danger" icon={Ban}>
            Blocked
          </StatusBadge>
        )}
      </div>
      {room.equipment.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {room.equipment.map((item) => (
            <StatusBadge key={item} tone="neutral">
              {item}
            </StatusBadge>
          ))}
        </div>
      )}
    </button>
  );
}
