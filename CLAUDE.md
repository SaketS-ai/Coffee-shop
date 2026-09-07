# CLAUDE.md — Social Cup Dallas

This file is the standing reference for anyone (human or AI agent) working in this
repository. The PRD (`SOCIAL_CUP_Proposal_Final 8.pdf`, v1.1) is the source of truth
for *what* to build. This file governs *how* to build it in this repo.

If something here conflicts with the PRD, the PRD wins for product behavior; this
file wins for engineering process and repo conventions.

---

## 1. Project Purpose

Social Cup is a coffee membership and discovery app for Dallas. Members pay a
monthly subscription ($24.99, 30 drink credits) and redeem those credits for real
drinks at a curated network of partner cafes by showing a code at the counter.
Members also discover cafes near them and rate individual drinks (not the cafe as
a whole).

Three surfaces, one backend:
- **Member app** — browse cafes, view drinks, subscribe, redeem, rate.
- **Admin panel** — Social Cup's team manages cafes, drink pricing, payouts, and
  the redemption audit log.
- **Barista scan page** — a lightweight, no-account, PIN-protected page a cafe
  uses to validate a member's code at the counter.

**Current phase**: local-first development. AWS, Stripe, S3/CloudFront, and
Google/Apple Sign-In are explicitly **out of scope** until stated otherwise —
see PRD "Out of Scope (Phase 2)" and the active phase plan. Do not build toward
them speculatively.

---

## 2. Architecture Principles

- **One backend, three frontends.** A single REST API serves the member app, the
  admin panel, and the barista page. Do not split these into separate backends.
- **Modular monolith, not microservices.** One Express app, organized by resource
  (routes/controllers per domain: cafes, drinks, redemptions, ratings, admin,
  auth). No service-to-service calls, no message queues, no separate deployables
  for this phase.
- **PostgreSQL is the single source of truth.** No parallel data stores. The
  earlier `localStorage`-based prototype (`store.ts`) is being retired — new work
  reads and writes through the real API, not local storage.
- **Server owns business rules.** Credit deduction, code expiry/invalidation,
  payout-rate locking, and rating aggregation are enforced server-side, in a
  database transaction where money or credits move. The client never decides
  whether a redemption is valid.
- **Local-first.** Everything must run on a developer's machine with no cloud
  account required. Cloud services get introduced only when the phase plan says
  so, one at a time, with the tradeoffs stated before adopting them.

---

## 3. Technology Stack

**Use only what's listed here.** Adding anything not listed requires the
justification step in §12 first.

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | React 19 + TypeScript + Vite | Already in place, keep it |
| Frontend styling | Tailwind CSS v4 | Existing warm-coffee palette in `index.css` |
| Frontend routing | React Router | Introduced for real `/admin`, `/scan/:cafeId`, `/app/*` separation |
| Frontend icons | `lucide-react` | Already in use |
| QR generation | `qrcode` | Already in use, canvas-rendered |
| QR scanning | one small camera-scanning lib (e.g. `html5-qrcode`) | Confirm choice at the point it's actually needed (Phase 7), not before |
| Backend runtime | Node.js + Express + TypeScript | REST API only |
| ORM | Prisma | Schema is the DB's source of truth; no hand-written migrations |
| Database | PostgreSQL, local instance for dev | See §8 |
| Auth | Email + password (bcrypt hash) + JWT session token | No OAuth this phase |
| Payments | none this phase | Stripe is deferred; subscribing is a direct dev-only state change until Stripe is reintroduced |

Explicitly **not** used this phase: Stripe, AWS (RDS/S3/CloudFront), Google/Apple
Sign-In, any message queue, any second database, any UI component library
(no MUI/shadcn — the existing hand-built Tailwind components stay), any state
management library beyond React's own (no Redux/Zustand/etc. unless a real need
is demonstrated).

---

## 4. Repository Structure

```
social-cup/
├── CLAUDE.md                  # this file
├── src/                        # frontend
│   ├── api/                    # one file per backend resource (auth, cafes, redemptions, ratings, admin)
│   ├── context/                 # AuthContext and any other cross-cutting React context
│   ├── routes/                  # React Router route definitions
│   ├── components/              # existing UI components, organized by surface (mobile/admin/barista/common)
│   ├── types/                   # shared TypeScript interfaces — extend, don't duplicate
│   └── data/                    # local seed/demo data, kept in sync with backend/prisma/seed.ts
├── backend/                     # backend
│   ├── src/
│   │   ├── routes/                # one router per resource, mirrors src/api/
│   │   ├── controllers/            # request/response handling per resource
│   │   ├── services/               # business logic and Prisma queries per resource
│   │   ├── middleware/             # auth middleware, role guard, error handling
│   │   ├── utils/                  # AppError, JWT, password hashing, validators
│   │   └── server.ts               # app entrypoint
│   └── prisma/
│       ├── schema.prisma          # database source of truth
│       ├── migrations/            # generated migration history
│       └── seed.ts                # dev seed data
```

This tree already reflects an approved deviation from earlier drafts of this
file: the backend directory is named `backend/`, not `server/` — the name
used through the rest of this document — because that's what the working
codebase already used by the time Prisma was adopted, and renaming it would
have meant touching `manage.py`, `.env.example`, and the frontend's API
client for no functional benefit. Every other `server/` reference below
means this directory.

Do not introduce a top-level `/frontend` + `/backend` split beyond this one
unless a specific deployment reason requires it — that's a large, purely-
structural change and must be proposed and approved on its own, not folded
into feature work.

---

## 5. Coding Standards

- **TypeScript strict mode**, both frontend and backend. No `any` without a
  one-line comment explaining why it's unavoidable.
- **No dead code.** Don't leave unused imports, unused variables, or commented-out
  blocks. If something is genuinely needed later, it isn't needed now — delete it.
- **No comments explaining *what* the code does** — names should do that. Comment
  only the *why*: a non-obvious constraint, a workaround, an invariant a future
  reader could easily violate by accident.
- **Small, focused changes.** A bug fix doesn't need a refactor riding along with
  it. A new endpoint doesn't need speculative options nobody asked for.
- **Consistent naming**: `camelCase` for variables/functions, `PascalCase` for
  components/types, resource names in routes are plural nouns (`/cafes`, not
  `/cafe`).
- Before considering any change done: `tsc` (or `tsc -b`) and the configured
  linter (`oxlint`) must both run clean, on both the frontend and `server/`.

---

## 6. Testing Requirements

No automated test framework is configured yet on either side — that's a known
gap, not a decision to leave it that way indefinitely.

- **Priority order matches the PRD's own QA emphasis (Module 10):** the credit
  ledger and redemption flow get tested before anything else. Specifically:
  concurrency (two scans of the same code at once), replay (reusing an already-
  redeemed code), expiry (scanning after the 5-minute window), and code
  invalidation (generating a new code cancels the old one).
- Until a formal test runner is added, any change to money- or credit-moving
  logic (`redemptions`, `admin` payout routes, membership state changes) must be
  manually verified end-to-end (via curl/Postman or the running UI) before being
  considered complete — passing `tsc` is necessary but not sufficient for that
  code path.
- When a test framework is introduced, it should be the smallest reasonable
  choice for the stack in use (e.g. Vitest for the frontend, a minimal
  supertest-based setup for the Express API) — propose it, don't silently add it.

---

## 7. Security Requirements

- **No hard-coded secrets, anywhere, ever.** API keys, DB credentials, and JWT
  signing secrets live only in `.env` files, which are git-ignored. Committed
  `.env.example` files hold placeholder values only.
- **Passwords are always hashed** (bcrypt, cost factor 10+) before storage. Never
  log, return, or store a plaintext password.
- **Every route that changes state or reveals member/cafe data requires auth.**
  Admin routes require an admin-role token. Barista routes require the cafe PIN
  (rate-limited on attempts, per PRD 8.4) — the scan link itself is not a secret,
  the PIN is.
- **Generic auth error messages.** Login/password-reset failures must not reveal
  whether an email is registered (prevents account enumeration).
- **Validate at the boundary.** Every request body from the client is untrusted —
  validate shape and types in the route handler before touching the database.
- **The client never computes anything that affects money or credits.** Credit
  cost, payout rate, and margin are always read from the server, not calculated
  or trusted from client input.

---

## 8. Database Rules

- **PostgreSQL, local instance for this phase** (decided in Phase 0). The
  connection string lives in `server/.env` (`DATABASE_URL`), never in code.
  Moving to a hosted Postgres (e.g. Neon) later is a connection-string change
  only — no application code should ever assume a specific host.
- **Prisma schema is the only way to change the database shape.** No manual
  `ALTER TABLE`, no hand-edited SQL against the dev database outside of a
  generated Prisma migration.
- **Every schema change goes through `prisma migrate dev`** with a descriptive
  migration name, committed alongside the code that needs it.
- **Money and credit fields are precise, not float-approximate where it matters**
  for accounting — review rounding behavior on any new price/payout field.
- **Payout rate is copied onto the redemption record at the moment of
  redemption** (PRD 7.5) — never computed by joining back to the cafe's
  *current* rate, since that must not change historical statements.
- **Credits are deducted only on a successful, server-validated scan** — never
  when a code is generated or displayed.

---

## 9. AI Agent Rules

- **Inspect before modifying.** Read the existing file(s) and understand current
  behavior before changing them. Never assume a file is empty, unused, or safe
  to overwrite without checking.
- **Do not delete or rewrite working code to solve a problem faster.** If an
  existing approach seems wrong, say so and propose a change — don't silently
  replace it.
- **Do not touch unrelated files.** A change scoped to the redemption endpoint
  does not also "clean up" an unrelated component.
- **Do not add a dependency without stating why it's needed and what it
  replaces or enables**, before installing it.
- **Do not introduce microservices, a second database, or new cloud
  infrastructure** without that being an explicit, discussed decision — not an
  implementation detail slipped into an unrelated task.
- **Do not fake functionality to make something look done.** If real behavior
  isn't implemented yet (e.g. real QR camera scanning before Phase 7), say so
  plainly rather than simulating it silently and letting it look finished.
- **Verify before declaring done.** Run the type-checker and linter; for
  anything touching credits/payments/auth, exercise the actual flow rather than
  trusting that it compiles.
- **Stop and ask before large architectural changes** (folder restructuring,
  swapping a core library, changing the auth model) rather than deciding
  unilaterally mid-task.

---

## 10. API Conventions

- Base path: `/api`. Resources are plural nouns: `/api/cafes`, `/api/drinks`,
  `/api/redemptions`, `/api/ratings`, `/api/admin/...`.
- Standard REST verbs: `GET` (read), `POST` (create / action), `PUT` (full
  update), `PATCH` (partial update), `DELETE` (remove).
- **Consistent response envelope**:
  ```json
  { "success": true, "data": { ... } }
  { "success": false, "error": "human-readable message", "reason": "MACHINE_CODE" }
  ```
  `reason` is used where the client needs to branch on a specific failure (e.g.
  the redemption scan's `EXPIRED_CODE` / `ALREADY_REDEEMED` / `WRONG_CAFE`).
- Use HTTP status codes correctly: `200`/`201` success, `400` bad input, `401`
  not authenticated, `403` authenticated but not permitted, `404` not found,
  `409` conflict (e.g. duplicate email), `500` unexpected server error.
- Auth via `Authorization: Bearer <jwt>` header, not cookies, for this phase.
- No API versioning (`/v1/...`) until there's a real reason to need it.

---

## 11. Git Conventions

- Commit only when explicitly asked to.
- Write commit messages that explain **why**, not a restatement of the diff.
- Never commit `.env` files or anything containing a real secret — `.gitignore`
  already excludes `.env`/`.env.*` (keeping `.env.example`).
- Keep commits scoped to one logical change. Don't bundle an unrelated fix into
  a feature commit.
- Never force-push, rewrite published history, or skip hooks (`--no-verify`)
  without being explicitly told to.
- New commits, not amended ones, unless amending is explicitly requested.

---

## 12. Rules Against Over-Engineering

- **YAGNI.** Build what the current phase needs, not what a hypothetical future
  phase might need.
- **No premature abstraction.** Three similar lines of code are better than a
  generic helper built for a pattern that's only appeared once.
- **No new libraries "just in case."** Every dependency added must map to a
  concrete, current requirement — state the requirement, then add the
  dependency, not the other way around.
- **No infrastructure ahead of need.** Don't add AWS, S3, a queue, a cache layer,
  or a second environment until the phase plan actually calls for it.
- **No speculative configuration.** Don't add feature flags, env-driven
  toggles, or abstraction layers for requirements that don't exist yet.
- **Simplicity is the default**, not an afterthought — if a simpler
  implementation covers the current requirement, use it even if a more general
  one feels more "correct."

---

## 13. Source of Truth

- **Product behavior**: the PRD (`SOCIAL_CUP_Proposal_Final 8.pdf`, v1.1).
- **Data shape**: `server/prisma/schema.prisma` for storage,
  `src/types/index.ts` for the frontend's view of that data — keep these two in
  sync deliberately, don't let them drift.
- **Process and conventions**: this file.

If the PRD is ambiguous or silent on something, ask rather than guessing — the
PRD itself flags at least one such gap (Module 2.6, "Need Confirmation" on
visitor browsing rights) as an explicit example of this pattern.
