import { Users } from 'lucide-react';

export function FilterPanel({
  attendeesInput,
  onAttendeesChange,
  equipmentOptions,
  selectedEquipment,
  onToggleEquipment,
}: {
  attendeesInput: string;
  onAttendeesChange: (value: string) => void;
  equipmentOptions: readonly string[];
  selectedEquipment: readonly string[];
  onToggleEquipment: (item: string) => void;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
        Find a room
      </h3>

      <label className="block sm:max-w-xs">
        <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Users className="h-3.5 w-3.5" /> Attendees
        </span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={attendeesInput}
          onChange={(e) => onAttendeesChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
      </label>

      <div className="mt-4">
        <span className="mb-2 block text-xs font-medium text-slate-600">Equipment needed</span>
        <div className="flex flex-wrap gap-2">
          {equipmentOptions.map((item) => {
            const checked = selectedEquipment.includes(item);
            return (
              <label
                key={item}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
                  checked
                    ? 'bg-sky-600 text-white ring-sky-600'
                    : 'bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleEquipment(item)}
                  className="sr-only"
                />
                {item}
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
