# AGENTS.md - Smart Campus Room Availability Checker

Instructions for AI coding agents (and human contributors) working in this repository.
Tools do not always load this file automatically. If your tool does not, the human must paste the relevant sections into the conversation and say so.

## Purpose
A small browser app that tells a student whether a fictional campus room is free for a requested time slot.
It uses fictional data only. There is no backend, login, database, booking creation or real personal data.
An optional "Explain availability" panel turns the already-computed result into a short sentence using a MOCK adapter.

## Architecture
- Entry: index.html -> src/main.tsx -> src/App.tsx (state and composition only).
- Data: src/data/rooms.ts (frozen catalog of 5 fictional rooms).
- Rules (pure functions, no React imports): src/lib/availability.ts (evaluateBooking, getProposedSlot), src/lib/filtering.ts (filterRooms, getRoomStatus, applyBlockOverrides, getEquipmentOptions), src/lib/constants.ts (120-minute limit, fixed current time 09:00).
- Explanation feature: src/lib/explain.ts (validation, mock adapter, fallback), src/components/ExplanationPanel.tsx.
- UI components: src/components/ (FilterPanel, RoomCard, StatusBadge, Timeline).
- Tests (Vitest): src/lib/*.test.ts and src/App.render.test.ts. Import alias: "@/" = src/.

## Acceptance criteria that must stay true
- AC1 Booking rules: a slot is available only if its start is after the fixed current time, the duration is a whole number from 1 to 120 minutes (120 allowed, 121 rejected), the room is not blocked, and it does not overlap an existing booking of that room. Touching endpoints are allowed.
- AC2 Catalog and filters: at least 4 fictional rooms; capacity must be >= attendees; a room must have ALL selected equipment; a blocked room is never reported available; availability uses only the selected room's bookings.
- AC3 Immutability: checks, filtering and explanations never mutate the room catalog or bookings.
- AC4 Explanation feature: the deterministic checker is authoritative; the explanation is optional, validated, falls back safely on any failure, and is labelled as generated text, not the booking status.
- AC5 Quality gate: npm test, npm run typecheck, npm run lint and npm run build all pass.

## Setup and safe commands (allowed without asking)
- npm install (restores from package-lock.json; does not change versions)
- npm run dev | npm run preview
- npm test | npm run typecheck | npm run lint | npm run build
- npm audit and npm audit --omit=dev (read-only reports)
- Reading any file in the repository.

## Coding conventions
- TypeScript strict mode. Keep business rules as pure functions in src/lib; do not import React there.
- One reason string per rejection reason; do not duplicate limits (use src/lib/constants.ts).
- Keep components small; do not put rule logic in components.
- Use at most one design pattern per change and only when a concrete maintainability problem justifies it.
- Keep fixtures frozen; never mutate src/data/rooms.ts at runtime.

## Test expectations
- Every behaviour change needs a test; prefer a test that fails before the fix and passes after it.
- Never weaken or delete an existing assertion to make a test pass.
- Run all four checks before proposing acceptance and report real totals (passed / total) from the actual run.
- Never claim a command was run unless it was. State clearly which tests were not run.

## Forbidden actions
- No secrets, API keys, tokens or .env files in the repository, the chat or the UI.
- No production deployment or publishing (no Publish, no hosting changes).
- No destructive commands: rm -rf, git reset --hard, force push, deleting files outside the task.
- No npm audit fix --force, and no adding, removing or upgrading dependencies without explicit human approval.
- No hand-editing package-lock.json.
- No real personal data and no calls from the app to external services or LLM APIs.
- No unrelated refactoring and no changes outside the files named in the task.

## Review gates
1. Before editing, list the files you plan to change and why.
2. Show the diff and wait for human approval for: dependency changes, any change to src/lib/availability.ts rules, and anything outside the stated scope.
3. After editing, run the four checks and report: changed files, rationale, commands and real results.
4. The human reviews the diff and the evidence before anything is accepted or merged.

## Known limitations (do not "fix" silently)
- The current time is fixed at 09:00 on purpose (demo data).
- The explanation adapter is a mock. A real LLM adapter must run server-side with the key kept out of the browser; this project has no backend.
- npm audit reports vulnerabilities in build and test tooling; they are handled through the risk register, not by running npm audit fix --force.
