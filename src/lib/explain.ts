import { formatTime, type Verdict } from '@/lib/availability';
import { MAX_DURATION_MIN } from '@/lib/constants';

/**
 * "Explain availability": optional, read-only feature.
 * The deterministic checker (evaluateBooking / getRoomStatus) decides availability.
 * This module only turns an already-computed result into a short student-friendly sentence.
 *
 * Contract
 *   Input  : { roomLabel, start, end, isAvailable, reasonCode }   (all untrusted until validated)
 *   Output : { explanation: string }  (<= 240 characters, <= 2 sentences, no markup,
 *            only the supplied times, must agree with isAvailable)
 *   Failure: any invalid input, timeout, adapter error or invalid output returns a deterministic fallback.
 */

export const REASON_CODES = [
  'available',
  'past-start',
  'invalid-range',
  'past-midnight',
  'invalid-duration',
  'duration-too-long',
  'blocked',
  'overlap',
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export const MAX_LABEL_LENGTH = 60;
export const MAX_EXPLANATION_LENGTH = 240;
export const DEFAULT_TIMEOUT_MS = 1500;

export type ExplainInput = {
  roomLabel: string;
  start: number;
  end: number;
  isAvailable: boolean;
  reasonCode: ReasonCode;
};

/** A model adapter. In the classroom it is a mock; a real one would run on a server, never in the browser. */
export type ExplainAdapter = (input: ExplainInput) => Promise<unknown>;

export type FailureKind = 'invalid-input' | 'timeout' | 'adapter-error' | 'invalid-output';

export type ExplainResult =
  | { source: 'generated'; explanation: string }
  | { source: 'fallback'; explanation: string; failure: FailureKind };

export type MockMode = 'ok' | 'timeout' | 'error' | 'malformed' | 'contradiction' | 'invented';

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

const LABEL_PATTERN = /^[\p{L}\p{N} \-—–().,']+$/u;
const INJECTION_PATTERN = /ignore (all |any )?(previous|prior)|system prompt|instructions?/i;

function isReasonCode(value: unknown): value is ReasonCode {
  return typeof value === 'string' && (REASON_CODES as readonly string[]).includes(value);
}

/** Build the structured context from the deterministic result. Output is treated as untrusted and validated later. */
export function toExplainInput(
  verdict: Verdict,
  roomLabel: string,
  start: number,
  duration: number
): Record<string, unknown> {
  return {
    roomLabel,
    start,
    end: start + duration,
    isAvailable: verdict.kind === 'available',
    reasonCode: verdict.kind === 'available' ? 'available' : verdict.reason,
  };
}

export function validateInput(raw: unknown): Check<ExplainInput> {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'input must be an object' };
  const r = raw as Record<string, unknown>;

  if (typeof r.roomLabel !== 'string') return { ok: false, error: 'roomLabel must be a string' };
  const label = r.roomLabel.trim();
  if (label.length === 0) return { ok: false, error: 'roomLabel is empty' };
  if (label.length > MAX_LABEL_LENGTH) return { ok: false, error: 'roomLabel is too long' };
  if (!LABEL_PATTERN.test(label)) return { ok: false, error: 'roomLabel has unsupported characters' };
  if (INJECTION_PATTERN.test(label)) return { ok: false, error: 'roomLabel looks like an instruction' };

  if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) {
    return { ok: false, error: 'start and end must be whole minutes' };
  }
  if (typeof r.isAvailable !== 'boolean') return { ok: false, error: 'isAvailable must be a boolean' };
  if (!isReasonCode(r.reasonCode)) return { ok: false, error: 'unknown reasonCode' };
  if (r.isAvailable !== (r.reasonCode === 'available')) {
    return { ok: false, error: 'isAvailable and reasonCode disagree' };
  }

  return {
    ok: true,
    value: {
      roomLabel: label,
      start: r.start as number,
      end: r.end as number,
      isAvailable: r.isAvailable,
      reasonCode: r.reasonCode,
    },
  };
}

/** Output validation: the model is never trusted. */
export function validateExplanation(raw: unknown, input: ExplainInput): Check<string> {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'output must be an object' };
  const text = (raw as Record<string, unknown>).explanation;
  if (typeof text !== 'string') return { ok: false, error: 'explanation must be a string' };

  const explanation = text.trim();
  if (explanation.length === 0) return { ok: false, error: 'explanation is empty' };
  if (explanation.length > MAX_EXPLANATION_LENGTH) return { ok: false, error: 'explanation is too long' };
  if ((explanation.match(/[.!?]+(?=\s|$)/g) ?? []).length > 2) return { ok: false, error: 'more than two sentences' };
  if (/[<>`]|https?:\/\//i.test(explanation)) return { ok: false, error: 'markup or links are not allowed' };
  if (INJECTION_PATTERN.test(explanation)) return { ok: false, error: 'explanation repeats an instruction' };

  const allowedTimes = new Set([formatTime(input.start), formatTime(input.end)]);
  for (const time of explanation.match(/\b\d{1,2}:\d{2}\b/g) ?? []) {
    const normalized = time.padStart(5, '0');
    if (!allowedTimes.has(normalized)) return { ok: false, error: `unsupported time ${time}` };
  }

  if (input.isAvailable) {
    if (/\b(unavailable|not available|cannot be booked|can't be booked|blocked|overlaps?)\b/i.test(explanation)) {
      return { ok: false, error: 'explanation contradicts an available result' };
    }
  } else if (/\b(is available|are available|can be booked|is free)\b/i.test(explanation)) {
    return { ok: false, error: 'explanation contradicts an unavailable result' };
  }

  return { ok: true, value: explanation };
}

/** Safe fallback text: static, built only from the reason code. */
export const FALLBACK_EXPLANATIONS: Record<ReasonCode, string> = {
  available: 'The requested slot has no conflicts in this room.',
  'past-start': 'The requested start time is not after the current time.',
  'invalid-range': 'The requested time range is not valid for a single day.',
  'past-midnight': 'The requested slot would run past midnight.',
  'invalid-duration': 'The requested duration is not valid.',
  'duration-too-long': `The requested duration is longer than the ${MAX_DURATION_MIN}-minute limit.`,
  blocked: 'This room is currently blocked and cannot be booked.',
  overlap: 'The requested slot overlaps an existing booking in this room.',
};
export const GENERIC_FALLBACK = 'A generated explanation is not available right now. The status shown above is the confirmed result.';

/** Mock adapter: deterministic templates plus switchable failure modes for demos and tests. */
export function createMockAdapter(mode: MockMode = 'ok'): ExplainAdapter {
  return (input) => {
    if (mode === 'timeout') return new Promise(() => {});
    if (mode === 'error') return Promise.reject(new Error('mock API failure'));
    if (mode === 'malformed') return Promise.resolve({ text: 'wrong shape' });
    if (mode === 'contradiction') {
      return Promise.resolve({ explanation: input.isAvailable ? 'This room is not available.' : 'This room is available for that slot.' });
    }
    if (mode === 'invented') {
      return Promise.resolve({ explanation: `${input.roomLabel} is booked by another student at 14:30.` });
    }
    return Promise.resolve({ explanation: mockText(input) });
  };
}

function mockText(input: ExplainInput): string {
  const a = formatTime(input.start);
  const b = formatTime(input.end);
  const label = input.roomLabel;
  switch (input.reasonCode) {
    case 'available':
      return `${label} has no conflicts between ${a} and ${b}. The requested slot is available.`;
    case 'overlap':
      return `The requested time (${a}–${b}) overlaps an existing booking in ${label}. Touching a booking's start or end time is allowed, but overlapping is not.`;
    case 'blocked':
      return `${label} is currently blocked, so it cannot be booked for ${a}–${b}.`;
    case 'past-start':
      return `The requested start time (${a}) is not after the current time. Choose a later start.`;
    case 'past-midnight':
      return `The slot starting at ${a} would run past midnight, so it is not allowed. Choose an earlier start or a shorter duration.`;
    case 'invalid-range':
      return 'The requested time range is not valid for a single day. Choose a start and duration within the day.';
    case 'invalid-duration':
      return 'The requested duration is not valid. Choose a positive whole number of minutes.';
    case 'duration-too-long':
      return `The requested duration is longer than the ${MAX_DURATION_MIN}-minute limit. Choose a shorter duration.`;
  }
}

class ExplainTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new ExplainTimeoutError('adapter timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(id);
        reject(error);
      }
    );
  });
}

/**
 * Validate input -> call adapter with a timeout -> validate output -> otherwise deterministic fallback.
 * It never receives rooms or bookings, so it cannot change an availability decision.
 */
export async function explainWithFallback(
  adapter: ExplainAdapter,
  rawInput: unknown,
  options: { timeoutMs?: number } = {}
): Promise<ExplainResult> {
  const checked = validateInput(rawInput);
  if (!checked.ok) return { source: 'fallback', explanation: GENERIC_FALLBACK, failure: 'invalid-input' };
  const input = checked.value;
  const fallback = (failure: FailureKind): ExplainResult => ({
    source: 'fallback',
    explanation: FALLBACK_EXPLANATIONS[input.reasonCode],
    failure,
  });

  let output: unknown;
  try {
    output = await withTimeout(Promise.resolve().then(() => adapter(input)), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  } catch (error) {
    return fallback(error instanceof ExplainTimeoutError ? 'timeout' : 'adapter-error');
  }

  const validated = validateExplanation(output, input);
  return validated.ok ? { source: 'generated', explanation: validated.value } : fallback('invalid-output');
}
