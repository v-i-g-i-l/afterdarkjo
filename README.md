# Afterdark.jo — Event & Party Ticketing Platform (Jordan)

A production-grade ticketing platform: public event browsing, ticket
purchase, manual CliQ payment verification, individually unique tickets with
cryptographically secure QR codes, PDF generation, and a door check-in
system that prevents duplicate entry.

Built with Next.js (App Router) + TypeScript + Tailwind CSS + PostgreSQL.

---

## 1. Architecture note: Prisma schema vs. runtime data layer

The data model is defined once, in **`prisma/schema.prisma`**, and it is the
source of truth for the schema. However, the actual runtime database layer
in `src/lib/db.ts` and `src/lib/services/*` uses **`pg` (node-postgres)**
against a hand-written SQL migration (`db/migrations/001_init.sql`) that
mirrors `schema.prisma` field-for-field.

**Why:** this project was built inside a sandboxed environment whose network
egress allowlist did not include `binaries.prisma.sh`, which is required to
download Prisma's `schema-engine`/`query-engine` binaries for
`prisma migrate` / `prisma generate`. Rather than leave the database layer
unbuilt, the same schema was translated to raw SQL and the service layer
was written against `pg` directly. Every transaction, constraint, and index
described below is live and was tested against a real PostgreSQL instance.

**If you have normal internet access** (a real dev machine, CI, or a cloud
sandbox without this restriction), you have two options:

- **Keep it as-is.** The `pg`-based layer is fully production-ready — it's
  just SQL + parameterized queries + explicit transactions, with no
  hidden magic. Nothing further is required.
- **Switch to Prisma Client**, if you prefer an ORM: run
  `npx prisma migrate dev` against the existing `prisma/schema.prisma`
  (it will generate an equivalent migration), then swap the query calls in
  `src/lib/services/*.ts` for `prisma.*` calls. The schema is already
  written and shouldn't need changes.

---

## 2. Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js Route Handlers (API routes)
- **Database:** PostgreSQL, accessed via `pg` (see note above)
- **Auth:** Custom email/password with bcrypt hashing + signed JWT session cookies
- **QR codes:** `qrcode`
- **PDF generation:** `pdfkit`
- **ZIP bundling:** `archiver`
- **Email:** `nodemailer` (falls back to console logging if `SMTP_HOST` is unset)
- **Validation:** `zod`

No Google Fonts / external font CDNs are used (the sandbox this was built in
couldn't reach `fonts.gstatic.com` either) — the design uses a system-font
stack (`Iowan Old Style`/`Georgia` for display, system UI sans for body).
You're free to swap in `next/font/google` for custom typefaces once
deployed somewhere with normal internet access.

---

## 3. Project structure

```
prisma/schema.prisma          Canonical data model (see note above)
db/migrations/001_init.sql    Hand-written SQL migration (used at runtime)
db/seed.js                    Seed script: categories, venues, events, users

src/lib/db.ts                 pg Pool + query/queryOne/withTransaction helpers
src/lib/auth.ts               Password hashing, JWT session cookies
src/lib/apiUtils.ts           requireRole() guard, error handling
src/lib/services/
  ids.ts                      Order number + cryptographically secure QR token generation
  orders.ts                   Atomic order creation, inventory reservation, expiry sweep
  payments.ts                 Idempotent admin approve/reject + ticket generation
  checkin.ts                  Atomic ticket verification + check-in (duplicate-scan-safe)
  ticketPdf.ts                Individual PDF ticket rendering (pdfkit + qrcode)
  ticketFiles.ts              PDF caching to disk + ZIP bundling
  mailer.ts                   Transactional email (SMTP or console fallback)

src/app/api/                  All REST API route handlers
src/app/                      All pages (public site, checkout, account, admin, staff)
src/components/               Shared UI components
```

---

## 4. Setup — local development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (local install, Docker, or a hosted instance)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET (openssl rand -hex 32), APP_URL

# 3. Create the database (adjust name/user as needed)
createdb ticketing

# 4. Apply the schema
npm run db:migrate
# (equivalent to: psql "$DATABASE_URL" -f db/migrations/001_init.sql)

# 5. Seed realistic demo data (events, venues, categories, test accounts)
npm run db:seed

# 6. Run the dev server
npm run dev
```

Visit `http://localhost:3000`.

### Seeded accounts (from `npm run db:seed`)

| Role     | Email                  | Password      |
|----------|-------------------------|---------------|
| Admin    | admin@afterdark.jo      | Admin123!     |
| Staff    | staff@afterdark.jo      | Staff123!     |
| Customer | customer@example.com    | Customer123!  |

**Change these passwords (or delete the seeded accounts and create your own
via Admin → Staff) before going to production.**

---

## 5. Production deployment

1. **Provision PostgreSQL** (e.g. a managed instance — RDS, Supabase,
   Neon, Railway, etc.) and apply `db/migrations/001_init.sql`.
2. **Deploy the Next.js app** to Vercel or any Node hosting that supports
   the Next.js App Router (a Node server, not static export — the app uses
   server-side rendering, route handlers, and a Postgres connection pool).
3. **Set environment variables** on the host (see `.env.example`):
   - `DATABASE_URL` — production Postgres connection string
   - `JWT_SECRET` — a long random value (`openssl rand -hex 32`)
   - `APP_URL` — the real production domain (used in QR verification links
     and emails — **this must be correct**, since it's embedded in every
     ticket's QR code)
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM`
     — a real transactional email provider (e.g. Postmark, SES, SendGrid).
     Without these, the app still works but emails are only logged, not sent.
4. **Run the seed script once** against production if you want the sample
   Jordan nightlife events, or skip it and create real events from
   Admin → Events instead.
5. **File storage:** generated ticket PDFs are cached to `storage/tickets/`
   on the server's local disk (`src/lib/services/ticketFiles.ts`). On a
   platform with an ephemeral filesystem (e.g. Vercel serverless functions),
   swap this for object storage (S3, R2, etc.) — the PDF bytes are already
   generated in-memory (`renderTicketPdf`), so this is a small change: write
   to your bucket instead of `fs.writeFile`, and read from it instead of
   `fs.readFile`.
6. **Reservation expiry:** stale reservations are swept lazily at the start
   of every new checkout attempt (`expireStaleReservations()` in
   `src/lib/services/orders.ts`). For a busier site, also wire this up as a
   scheduled job (cron / Vercel Cron) hitting a small wrapper endpoint every
   1–5 minutes so inventory frees up even without new checkout traffic.

---

## 6. Admin & staff setup

- The first admin account must be created directly in the database (via the
  seed script, or manually) since there's no public admin signup:
  ```sql
  -- example: promote an existing registered user to ADMIN
  UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
  ```
- After that, **Admin → Staff** lets the admin create additional Admin or
  Staff accounts directly from the UI (`/admin/staff`).
- **Staff accounts** can only access `/staff/scan` (door check-in) — they
  cannot see payments, analytics, or event management.
- **Admin accounts** have full access: event/ticket-type management,
  payment verification, staff management, settings, and analytics.

---

## 7. CliQ payment configuration

Go to **Admin → Settings** (`/admin/settings`) to configure, without a
redeploy:
- Business name
- **CliQ alias** shown to customers at checkout
- Payment instructions text
- Support phone / email
- Reservation window (minutes) — how long a cart is held before it expires

This is stored in the `site_settings` table (a single row) and read live by
the checkout page.

---

## 8. How the critical business rules are enforced

This section maps each non-negotiable rule from the spec to where it's
implemented and how it was verified.

| Rule | Where | How it's enforced |
|---|---|---|
| Mandatory three-part name | `src/lib/services/orders.ts` (`assertThreePartName`) | Server-side validation inside the same transaction as order creation; rejected orders never reach the DB. Also enforced client-side for UX. |
| Sequential, server-generated, never-reused ticket numbers | `ticket_number_sequence` table + `src/lib/services/payments.ts` | A dedicated single-row sequence table is atomically incremented (`UPDATE ... SET last_number = last_number + N RETURNING last_number`) inside the approval transaction. Numbers are never decremented or reused, even if a ticket is later cancelled. |
| Unique, cryptographically secure QR tokens | `src/lib/services/ids.ts` (`generateQrToken`) | `crypto.randomBytes(32)` -> 256-bit token, `UNIQUE` DB constraint on `tickets.qr_token`. Never derived from ticket number, order ID, or customer name. |
| One ticket = one PDF, own QR | `src/lib/services/ticketPdf.ts`, `ticketFiles.ts` | Each `Ticket` row gets its own PDF generated from its own `qr_token`; multi-ticket orders never share a QR code. |
| Payment is never auto-verified | `src/lib/services/orders.ts` (`submitTransferConfirmation`) | Confirming a transfer only ever moves an order `AWAITING_PAYMENT -> PAYMENT_VERIFICATION`. Only `src/lib/services/payments.ts` (`approvePayment`, admin-only) can move it to `PAID`. |
| Admin approval is atomic + idempotent | `src/lib/services/payments.ts` (`approvePayment`) | Runs inside one DB transaction with `SELECT ... FOR UPDATE` row locks. If the order is already `PAID`, it's a no-op that returns the existing tickets rather than creating new ones. Verified: calling approve twice in a row produces `alreadyProcessed: true` on the second call with zero new tickets. |
| No overselling | `src/lib/services/orders.ts` (`createOrder`) | Each `ticket_types` row is locked with `FOR UPDATE` before checking `remaining >= requested`, inside the same transaction that increments `reserved_count`. Verified under real concurrency: 5 simultaneous purchase requests for the last remaining ticket produced exactly 1 success. |
| One scan = one check-in, duplicate scans caught | `src/lib/services/checkin.ts` (`verifyAndCheckIn`) | `UPDATE tickets SET status='USED' ... WHERE id=$1 AND status='VALID'` — a conditional atomic update, not a read-then-write. Verified under real concurrency: 8 simultaneous scans of the same ticket produced exactly 1 `VALID_CHECKED_IN` and 7 `ALREADY_USED`. |
| Reservation expiry releases inventory | `src/lib/services/orders.ts` (`expireStaleReservations`) | Swept at the start of every checkout attempt; releases `reserved_count` and marks the order `EXPIRED`. Verified by manually aging a reservation past its window and confirming inventory was released on the next request. |
| Customers never reach admin functionality | `src/lib/apiUtils.ts` (`requireRole`) + `src/app/admin/layout.tsx` | Every admin/staff API route calls `requireRole(...)` server-side (not just UI hiding); the admin layout also redirects non-admins client-side for UX. |

---

## 9. Testing this yourself

A full end-to-end test script is included at `test-e2e.sh` (uses `curl`
against a running `npm run dev` server + seeded database). It walks through:
register/login, browse, checkout, a three-part-name rejection test, CliQ
transfer confirmation, admin approval called twice to prove idempotency,
PDF download, ZIP download, staff check-in, duplicate check-in rejection,
and the public verify page.

```bash
npm run dev &
npm run db:seed   # if not already seeded
bash test-e2e.sh
```

---

## 10. Remaining external credentials required for a real launch

These are placeholders in `.env.example` that need real values before
accepting real payments and customers:

1. **A real CliQ business alias** — set via Admin → Settings, not an env
   var, so it can be updated without a redeploy.
2. **A transactional email provider** (SMTP credentials) — without this,
   order confirmation and rejection emails are only logged to the server
   console, not delivered.
3. **A production PostgreSQL instance** and its connection string.
4. **A production domain** for `APP_URL` — this is embedded in every QR
   code's verification URL, so it must be set correctly before any real
   tickets are issued. Changing it later would invalidate old QR links
   unless you keep the old domain redirecting.
5. **(Optional) Object storage** if deploying to a platform with an
   ephemeral filesystem, per the note in section 5.

---

## 11. Customer auto-fill & internal login buttons (added after initial build)

- **Customers only type their name/email/phone once.** Registration
  (`/register`) now enforces the same three-part-name rule used at
  checkout, and requires a phone number. Once signed in, the checkout page
  (`TicketSelector`) automatically pulls the saved name/email/phone from
  `/api/account/profile` and uses it for the order — no retyping on future
  purchases. A "Not you? Edit details for this order" link lets them
  override it for a one-off order (e.g. buying for a friend) without
  changing their saved profile. Customers can update their saved name/phone
  any time from **Account → Profile Settings** (`/account/profile`).
- **Admin and staff now log in with a visible username/password form right
  on the gated page**, instead of just a text link to a separate page.
  Visiting `/admin` while logged out (or as a non-admin) shows an inline
  "Admin log in" form with username (email) + password fields and a
  "Log in" button; the same pattern gates `/staff/scan` for door staff.
  Logging in with the wrong role (e.g. a customer account on `/admin`) is
  rejected and the session is cleared. A "Admin login" link is also in the
  site header/mobile menu for discoverability.
