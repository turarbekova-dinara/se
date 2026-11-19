# Project memory

## Product intent & audience

- Scheduling/availability app that evaluates requested time slots and proposes alternatives.
- Core domain: minutes-based time math within a single day (0–1440), past-midnight detection, slot proposals.

## Brand personality & voice

- User prefers careful, approval-gated workflows: show diffs first, wait for approval, then apply + run checks.
- Values minimal, surgical patches; explicitly rejects refactors or scope creep during fixes.

## Visual design & UX direction

- App.tsx renders a "Requested slot" line and a verdict line; display text must stay consistent with verdict logic.
- Uses `@/` import alias for all project modules.
- UI built with React + Tailwind; icons via `lucide-react`. No extra UI/theme packages.

## Decisions, constraints & rationale

- Acceptance criteria AC1–AC6 govern behavior; must not be changed during display fixes.
- `getProposedSlot` returns null for past-midnight requests; verdict + timeline are already correct for that case.
- Display formatting helpers live in `src/lib/availability.ts` (`formatRange`, `formatTime`, `pad`, `toMinutes`, `MINUTES_IN_DAY`, `Minutes` type).
- Clamping end time to `MINUTES_IN_DAY` avoids wrapped display (e.g. 23:00–01:00) that contradicts "past midnight" verdict; midnight renders as "00:00".
- Quality gate: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` after changes.

## Open questions & assumptions

- Open: clamped end renders as "00:00" (current minimal) vs "24:00" (needs extra formatting) — user preference pending.
- Assumed test runner is Vitest (`.test.ts` colocated with lib); no contrary evidence yet.
- Assumed only App.tsx consumes the "Requested slot" display; no other call sites identified.