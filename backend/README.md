# Entter — Backend

NestJS API for the Entter event credentialing & check-in platform. See the [root README](../README.md) for product context and [`docs/ARQUITETURA_credenciamento_eventos.md`](../docs/ARQUITETURA_credenciamento_eventos.md) for the full technical spec.

## Stack

- **Framework:** NestJS + TypeScript
- **Database:** PostgreSQL via [Prisma ORM](https://www.prisma.io) (v7, driver adapters — see `src/prisma/prisma.service.ts`)
- **Auth:** JWT stored in an httpOnly cookie, `bcrypt` password hashing

## Setup

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
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

## Tests

```bash
npm run test        # unit tests
npm run test:e2e     # e2e tests
npm run test:cov     # coverage
```
