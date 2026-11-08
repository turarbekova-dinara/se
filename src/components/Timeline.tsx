import { CalendarClock } from 'lucide-react';
import type { Booking } from '@/data/rooms';
import { formatRange, formatTime, type Minutes } from '@/lib/availability';
import { MINUTES_IN_DAY } from '@/lib/constants';

const HOUR_MARKS = Array.from({ length: 25 }, (_, i) => i * 60);

export function Timeline({
  now,
  bookings,
  proposed,
  blocked,
}: {
  now: Minutes;
  bookings: readonly Booking[];
  proposed: { start: Minutes; end: Minutes } | null;
  blocked: boolean;
}) {
  const pct = (min: Minutes) => `${(min / MINUTES_IN_DAY) * 100}%`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-slate-700">
        <CalendarClock className="h-5 w-5 text-slate-500" />
        <h3 className="text-sm font-semibold tracking-wide uppercase">
          Day timeline
        </h3>
      </div>

      <div className="relative h-16 w-full select-none">
        {/* track */}
        <div className="absolute inset-x-0 top-6 h-7 rounded-full bg-slate-100" />

        {/* "now" marker zone (past = unusable) */}
        <div
          className="absolute top-6 h-7 rounded-l-full bg-slate-200"
          style={{ left: '0%', width: pct(now) }}
          title={`Now: ${formatTime(now)}`}
        />

        {/* existing bookings */}
        {bookings.map(({ start: s, end: e }, i) => (
          <div
            key={i}
            className="absolute top-6 h-7 bg-amber-400/90"
            style={{ left: pct(s), width: pct(e - s) }}
            title={`Existing booking ${formatRange(s, e)}`}
          />
        ))}

        {/* proposed slot */}
        {proposed && (
          <div
            className={`absolute top-6 h-7 ring-2 ring-white ${
              blocked ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ left: pct(proposed.start), width: pct(proposed.end - proposed.start) }}
            title={`Proposed ${formatRange(proposed.start, proposed.end)}`}
          />
        )}

        {/* now line */}
        <div
          className="absolute top-4 bottom-0 w-px bg-slate-900"
          style={{ left: pct(now) }}
        >
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
            Now {formatTime(now)}
          </span>
        </div>
      </div>

      {/* hour ticks */}
      <div className="relative mt-1 h-4 w-full">
        {HOUR_MARKS.filter((_, i) => i % 2 === 0).map((m) => (
          <div
            key={m}
            className="absolute -translate-x-1/2 text-[10px] text-slate-400"
            style={{ left: pct(m) }}
          >
            {formatTime(m)}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
        <Legend color="bg-slate-200" label="Past (unusable)" />
        <Legend color="bg-amber-400" label="Existing booking" />
        <Legend color="bg-emerald-500" label="Proposed slot" />
        <Legend color="bg-rose-500" label="Blocked / rejected" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
