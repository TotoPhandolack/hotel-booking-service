# hotel-booking-service

NestJS REST API for a multi-tenant guesthouse management and booking platform.

## Stack

- NestJS 11 and TypeScript
- Prisma ORM 6 with Neon Postgres
- JWT access tokens and bcryptjs password hashing
- Resend for owner invitation emails

## Requirements

- Node.js 20.11 or later
- npm
- A Neon Postgres database

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set the values. Use Neon's pooled connection string for `DATABASE_URL` and its direct connection string for `DIRECT_URL`.
3. Generate the Prisma client: `npm run prisma:generate`
4. Apply the initial database migration: `npm run prisma:migrate:dev`
5. Set `BOOTSTRAP_SUPERADMIN_EMAIL` and `BOOTSTRAP_SUPERADMIN_PASSWORD` in the shell, then run `npm run bootstrap:superadmin` once. The command refuses to create a second superadmin.
6. Configure `RESEND_API_KEY` and `MAIL_FROM` to send owner invitations.
7. Start the API: `npm run start:dev`

The API listens on port 4000 by default and serves endpoints below `/api/v1`. Access tokens last 900 seconds by default; configure `JWT_EXPIRES_IN_SECONDS` between 60 and 86,400 seconds.

## API foundation

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Public | Checks API and database readiness |
| POST | `/api/v1/auth/login` | Public | Returns a short-lived bearer access token |
| GET | `/api/v1/auth/me` | Authenticated | Returns the current user and active guesthouse memberships |
| POST | `/api/v1/admin/owner-invitations` | Superadmin | Creates a guesthouse owner invitation and emails its one-time link |
| POST | `/api/v1/auth/accept-invitation` | Public | Accepts a valid invitation and creates the owner and guesthouse |

Invitation tokens are random, single-use, expire after 24 hours, and only their SHA-256 hashes are stored. Invitation creation fails if email delivery is not configured or fails.

## Tenant authorization

Tenant membership and branch assignment guards are provided for tenant-scoped controllers. Owners can access active branches in their own guesthouse. Staff require an explicit assignment. Branch and assignment rows carry a tenant ID, with composite foreign keys preventing cross-tenant assignments at the database level.

All tenant-aware services must scope queries by the authenticated membership's `tenantId`; never trust a tenant ID supplied by the client without checking membership.

## Database migrations

- Local development: `npm run prisma:migrate:dev`
- Deployment: `npm run prisma:migrate:deploy`
- Do not use `prisma db push` for a shared or production database.

The frontend repository is separate. This service directory is ignored by the parent repository so each project keeps its own Git history and remote.

## Checks

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run prisma:generate`
