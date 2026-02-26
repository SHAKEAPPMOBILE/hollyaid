# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Hollyaid is a **React SPA** (Vite + TypeScript + Tailwind CSS + shadcn/ui) for workplace wellness. The backend is entirely **hosted Supabase** (auth, PostgreSQL, Edge Functions) — no local database or backend server to run. Supabase Edge Functions live under `supabase/functions/` and are written in Deno/TypeScript.

### Running the app

- `npm run dev` — starts the Vite dev server on **port 8080** (see `vite.config.ts`).
- `.env` at the repo root contains the Supabase connection variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`).

### Lint / Type-check / Build

- `npm run lint` — ESLint (flat config in `eslint.config.js`). Pre-existing `@typescript-eslint/no-explicit-any` errors exist in Supabase edge-function files.
- `npx tsc --noEmit` — TypeScript type check (passes cleanly).
- `npm run build` — Vite production build.

### Testing

- Playwright is listed as a dependency with a `playwright-fixture.ts` file, but no test files exist yet. If you need to write E2E tests, install browsers first: `npx playwright install --with-deps chromium`.

### Auth flow

- OTP login uses Supabase magic links; the email redirect URL is `${window.location.origin}/auth/callback`.
- `AuthCallback.tsx` handles post-auth redirect by checking user role (specialist → `/specialist-dashboard`, company → `/admin`, employee → `/dashboard`).
- `AuthHashRedirect` in `App.tsx` catches hash-fragment tokens (e.g. `/#access_token=…`) on any page and forwards them to `/auth/callback`.
- The Supabase project's **Site URL** and **Redirect URLs** must be configured in the Supabase dashboard to include your deployment domain's `/auth/callback` path. If they're not whitelisted, Supabase falls back to the Site URL and the hash redirect handler picks it up.

### Notes

- The package manager is **npm** (`package-lock.json`). A `bun.lockb` also exists but bun is not used in CI.
- The `/specialists` page queries a Supabase table (`public.specialist_registrations`) that may not exist in every project instance — this is expected behavior for a pre-launch product.
