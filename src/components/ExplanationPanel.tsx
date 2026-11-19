import { useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { Verdict } from '@/lib/availability';
import {
  createMockAdapter,
  explainWithFallback,
  toExplainInput,
  type ExplainResult,
  type MockMode,
} from '@/lib/explain';

const MODE_LABELS: Record<MockMode, string> = {
  ok: 'Normal',
  timeout: 'Simulate timeout',
  error: 'Simulate API error',
  malformed: 'Simulate malformed output',
  contradiction: 'Simulate contradicting output',
  invented: 'Simulate invented details',
};

const FAILURE_LABELS = {
  'invalid-input': 'the request was not valid',
  timeout: 'the assistant timed out',
  'adapter-error': 'the assistant returned an error',
  'invalid-output': 'the assistant reply failed validation',
} as const;

type Props = { roomLabel: string; verdict: Verdict; start: number; duration: number };

/**
 * Optional "Explain availability" panel. It only reads the deterministic verdict.
 * A stored result is shown only while it still matches the current request, so a stale
 * explanation can never sit next to a different decision.
 */
export function ExplanationPanel({ roomLabel, verdict, start, duration }: Props) {
  const [mode, setMode] = useState<MockMode>('ok');
  const [loading, setLoading] = useState(false);
  const [stored, setStored] = useState<{ key: string; result: ExplainResult } | null>(null);
  const requestId = useRef(0);

  const input = toExplainInput(verdict, roomLabel, start, duration);
  const inputKey = JSON.stringify(input);
  const current = stored && stored.key === inputKey ? stored.result : null;
  const confirmed = verdict.kind === 'available' ? 'Available' : 'Unavailable';

  async function handleExplain() {
    const id = ++requestId.current;
    setLoading(true);
    const result = await explainWithFallback(createMockAdapter(mode), input);
    if (id !== requestId.current) return;
    setStored({ key: inputKey, result });
    setLoading(false);
  }

  return (
    <section className="mt-6 rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-violet-800">
            Explain availability (optional)
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Confirmed status from the booking rules: <span className="font-semibold">{confirmed}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleExplain}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Explain availability
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
        Mock adapter mode (demo)
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as MockMode)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
        >
          {(Object.keys(MODE_LABELS) as MockMode[]).map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      <div role="status" aria-live="polite" className="mt-3 min-h-[1.5rem]">
        {current && (
          <div className="rounded-xl border border-violet-200 bg-white p-3 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              {current.source === 'generated'
                ? 'Generated explanation (mock mode) · not the booking status'
                : `Fallback explanation · ${FAILURE_LABELS[current.failure]}`}
            </p>
            <p className="mt-1">{current.explanation}</p>
          </div>
        )}
      </div>
    </section>
  );
}
