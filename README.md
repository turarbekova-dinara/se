# Smart Campus Room Availability Checker

Small React + TypeScript web application for checking fictional campus room availability. Uses fictional data only; no login, database, backend, or real personal data.

## Setup and Commands
- `npm install` (restore from `package-lock.json`)
- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit` and `npm audit --omit=dev` (read-only)

## Security and AI Notes
- The "Explain availability" feature uses a browser-side mock adapter with output validation and deterministic fallback.
- Do not put API keys or secrets in browser code; a real LLM adapter requires a server-side endpoint.
- Do not run `npm audit fix --force` without reviewing breaking changes.