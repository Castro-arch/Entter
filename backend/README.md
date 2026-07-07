# Entter — Backend

NestJS API for the Entter event credentialing & check-in platform. See the [root README](../README.md) for product context and [`docs/ARQUITETURA_credenciamento_eventos.md`](../docs/ARQUITETURA_credenciamento_eventos.md) for the full technical spec.

## Stack

- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL via [Prisma ORM](https://www.prisma.io) (v7, driver adapters — see `src/prisma/prisma.service.ts`)
- **Auth:** JWT stored in an httpOnly cookie, `bcrypt` password hashing
- **Realtime:** Socket.IO gateway for the check-in dashboard (`src/attendance/attendance.gateway.ts`)
- **Cache / locks:** Redis (`ioredis`) — check-in dedup lock and cached attendance counters

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, REDIS_URL
docker compose up -d   # Postgres + Redis for local dev
```

Apply the schema to a local PostgreSQL database:

```bash
npx prisma migrate dev
```

## Run

```bash
npm run start:dev    # watch mode
npm run start:prod    # production build output
```

## Auth

- `POST /auth/register` — creates a tenant (organizer account) and its first owner user.
- `POST /auth/login` — authenticates and sets the `access_token` httpOnly cookie.
- `POST /auth/logout` — clears the cookie.
- `GET /auth/me` — returns the authenticated user (requires the cookie or an `Authorization: Bearer <token>` header).

## Events

All routes require authentication and are scoped to the caller's tenant — an
organizer can never read or modify another tenant's events.

- `POST /events` — creates an event with its days and (optional) ticket types.
  At least one day is required; the day count is what later distinguishes
  single-day (manual roll-call) from multi-day (QR) check-in. Starts as `DRAFT`.
- `GET /events` — lists the tenant's events (newest first) with days and ticket types.
- `GET /events/:id` — returns a single event; `404` if it isn't the tenant's.
- `PATCH /events/:id` — updates the event's own fields (name, description,
  location, cover image, `status`). Days and ticket types are managed separately.
- `PATCH /events/:id/credential` — sets the credential artwork URL and the
  attendee-name placement (`xPct`/`yPct`/`fontPct`/`color`/`align`), stored as
  percentages so the layout is resolution-independent.

## Public

Unauthenticated, attendee-facing endpoints. They only ever expose `PUBLISHED`
events and a safe subset of fields (never the tenant id, Asaas ids, or
credential/certificate config).

- `GET /public/events/:id` — a single published event with its days and ticket
  types; `404` for drafts, finished, or unknown events.
- `GET /public/tenants/:subdomain/events` — an organizer's published events.

## Checkout & payments

- `POST /public/events/:id/checkout` — starts a purchase for a ticket type
  (buyer name/email/phone). Creates a `PENDING` order, opens an Asaas charge,
  and returns a `paymentUrl`.
- `POST /webhooks/asaas` — Asaas payment webhook. On a settled payment
  (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`) it marks the order `PAID`, provisions
  the attendee (with a signed QR token), and decrements the ticket stock — all
  in one transaction, and **idempotently** (repeat webhooks are no-ops). If
  `ASAAS_WEBHOOK_TOKEN` is set, the `asaas-access-token` header must match.

With no `ASAAS_API_KEY`, checkout runs in **dev mode**: no real charge is
created and the buyer is sent to a local pending page, so the whole flow —
including the webhook — can be exercised without Asaas credentials.

Provisioning also creates a `PENDING` `Attendance` row for every day of the
event, which is what check-in flips to `PRESENT` — see below.

## Check-in

All routes require authentication and are scoped to the caller's tenant, same
as `/events`.

- `POST /events/:eventId/attendance/check-in` — checks a participant in for
  one event day. `{ method: 'QR', qrToken }` or `{ method: 'MANUAL',
  participantId }`. A short-lived Redis lock (`SET ... NX EX 5`) rejects
  near-simultaneous duplicate scans before they reach Postgres; the actual
  state change is an atomic `UPDATE ... WHERE status = 'PENDING'`, so a
  replayed request is a no-op (`already_checked_in`), never a duplicate.
  Broadcasts the day's updated counters over the WebSocket gateway.
- `POST /events/:eventId/attendance/batch-sync` — the same operation over a
  list of queued scans (`{ checkIns: [...] }`), for the offline client queue
  to replay once connectivity returns. Each item is independent — one bad
  item doesn't fail the batch.
- `GET /events/:eventId/attendance/summary` — total/checked-in/missing per
  event day. Backed by Redis counters that are lazily warmed from Postgres
  (`COUNT`) on first read, then `INCR`'d on each confirmed check-in.
- `GET /events/:eventId/attendance/search?eventDayId=&q=` — name search for
  the manual roll-call UI and the QR fallback.
- `PATCH /events/:eventId/attendance/participants/:id/will-not-attend` —
  marks an attendee as not coming, so they don't show up as "missing".

**WebSocket** (`/socket.io`, same origin as the API): the dashboard connects
with the `access_token` cookie, emits `join` with `{ eventId }` (verified
against the caller's tenant), and receives `attendance:update` events with
`{ eventDayId, total, present, missing }` as check-ins land.

**QR payload note:** the client never validates the QR signature — `qr-token.ts`
signs it with a symmetric secret (`QR_SECRET`) that must stay server-side.
The scanner UI decodes the *unsigned* body only to show an optimistic "checking
in…" state; the server performs the real signature check in
`AttendanceService.checkIn`.

## Tests

```bash
npm run test        # unit tests
npm run test:e2e     # e2e tests
npm run test:cov     # coverage
```
