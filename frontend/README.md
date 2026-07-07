# Entter — Organizer Dashboard

Next.js (App Router) frontend for the Entter event credentialing & check-in
platform. See the [root README](../README.md) for product context.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Auth:** talks to the NestJS API as a client-side SPA, authenticating via the
  httpOnly `access_token` cookie (`credentials: 'include'` on every request)

## Setup

```bash
npm install                          # from the repo root (workspaces)
cp .env.example .env.local           # set NEXT_PUBLIC_API_URL (defaults to :3000)
npm run dev                          # http://localhost:3001
```

The dashboard runs on port **3001** so it doesn't collide with the API on 3000.
The backend must allow this origin via `FRONTEND_URL` for credentialed requests.

## Structure

```
src/
├── app/
│   ├── (auth)/                    # login & registration (centered auth layout)
│   ├── dashboard/                 # protected shell, redirects unauthenticated visitors
│   │   ├── page.tsx               # events list + "New event" CTA
│   │   └── events/new/page.tsx    # multi-step event creation wizard
│   ├── layout.tsx                 # wraps the app in <AuthProvider>
│   └── page.tsx                   # landing
├── components/ui.tsx              # Button, TextField, TextArea, Alert primitives
└── lib/
    ├── api.ts                     # typed API client (authApi, eventsApi) + ApiError
    └── auth/auth-context.tsx      # AuthProvider + useAuth() (session state)
```

## Auth model

`AuthProvider` resolves the session once on mount by calling `GET /auth/me`.
Because the token lives in an httpOnly cookie it is never read from JavaScript;
the client only tracks whether a session exists. Route protection is a
client-side convenience — the API independently enforces auth on every request.

## Scripts

```bash
npm run dev      # dev server on :3001
npm run build    # production build
npm run lint     # ESLint (flat config)
```
