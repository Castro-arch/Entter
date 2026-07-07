# Entter — Backend

NestJS API for the Entter event credentialing & check-in platform. See the [root README](../README.md) for product context and [`docs/ARQUITETURA_credenciamento_eventos.md`](../docs/ARQUITETURA_credenciamento_eventos.md) for the full technical spec.

## Stack

- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL via [Prisma ORM](https://www.prisma.io) (v7, driver adapters — see `src/prisma/prisma.service.ts`)
- **Auth:** JWT stored in an httpOnly cookie, `bcrypt` password hashing
- **Certificates:** `pdf-lib` compositing + `nodemailer` delivery, rendered and
  sent asynchronously on a `BullMQ` queue (Redis)

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
- `PATCH /events/:id/certificate` — sets the certificate template URL, the
  same `%`-based name placement, `dispatchMode` (`MANUAL`/`AUTO`), and
  `autoDelayHours`. Changing `dispatchMode` or `autoDelayHours` clears
  `certificatesDispatchedAt`, so an edited event is eligible for the
  auto-dispatch sweep again.

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

## Participants

- `GET /events/:id/participants` — the tenant's attendee list for an event,
  with per-attendee credential/certificate send timestamps.

## Certificates

- `POST /events/:eventId/participants/:participantId/certificate` — queues
  one participant's certificate for render + email.
- `POST /events/:eventId/certificates/send-all` — queues every eligible
  participant (no certificate sent yet, not marked `willNotAttend`) for the
  event.

Both endpoints only enqueue a `BullMQ` job and return immediately — the
actual PDF render (`pdf-lib`, compositing the name onto
`certificateTemplateUrl` at `certificateNamePosition`, the same `%`-based
placement as the credential editor) and email happen in
`certificates.worker.ts`, off the request thread.

**Auto-dispatch:** when `certificateDispatchMode` is `AUTO`, a repeatable
BullMQ job sweeps every 15 minutes for events whose last day +
`certificateAutoDelayHours` has passed and haven't been dispatched yet
(`Event.certificatesDispatchedAt`), and queues them the same way. This trades
the doc's per-event delayed job for a small polling sweep — simpler, and nothing
needs to be rescheduled or cancelled when an organizer edits the event later.

With no `SMTP_HOST`, certificate email sends run in **dev mode**: the email is
logged instead of sent, so the render/queue/send pipeline can be exercised
without real SMTP credentials — same pattern as `ASAAS_API_KEY`.

## Tests

```bash
npm run test        # unit tests
npm run test:e2e     # e2e tests
npm run test:cov     # coverage
```
