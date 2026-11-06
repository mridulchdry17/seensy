# Seensy

Email open + link-click tracking for job seekers: a Chrome extension for Gmail, backed by a
Cloudflare Worker. Phase 1 is a single-user build for Mridul's own outreach; phase 2 adds
accounts, a dashboard and the Chrome Web Store listing. Product blueprint:
https://claude.ai/artifact/22anuDCuY7usU6eCzdy1Se

## The team (how to work in this repo)

Work as a senior engineering lead with three specialists, and apply each one's standards
to every change:

- **Senior backend engineer (7+ yrs):** owns `backend/`. Layered MVCS, typed contracts,
  validated input, idempotent writes, no N+1 queries, errors that say what to fix.
- **Senior frontend engineer:** owns `frontend/`. Small modules with one job each, all
  network calls through one client, no framework where plain TS does the job, nothing
  runs that the user can't see the reason for.
- **Product designer:** owns how it looks and reads. One token set (below), plain copy
  written from the user's side ("Tracking on", not "Instrumentation enabled"), visible
  focus states, works in light and dark.

## Engineering principles (non-negotiable)

1. **No unused code.** No dead functions, speculative options or commented-out blocks.
   `noUnusedLocals`/`noUnusedParameters` are on; keep them passing.
2. **DRY, with one source of truth.** API types, ID format, tracking paths and cookie names
   live in `shared/contracts.ts` and are imported by both sides. Never redeclare them.
3. **YAGNI / KISS.** Build what the current phase needs. Phase 2 features (billing, plans,
   dashboard, file uploads) are not stubbed in early.
4. **Layering (backend MVCS):** `routes → controllers → services → models`.
   - *Controllers* parse HTTP (params, body, headers), call one service, shape the response.
     No SQL, no business rules.
   - *Services* hold business rules (verdicts, ownership checks). No `Request`/`Response`.
   - *Models* are the only place SQL lives. One file per table. No business rules.
   - *Schemas* (zod) validate every request body/query before a service sees it.
   - Pure logic (verdict rules, link kinds) is plain functions with unit tests.
5. **Frontend structure:** `content/` (inside Gmail) never calls the API directly; it sends
   typed messages to `background/`, which owns the single `ApiClient` and the retry outbox.
6. **Fail safe for the recipient.** The pixel always returns a GIF and known links always
   redirect, even if logging fails. Event writes go through `waitUntil`.
7. **Privacy by default.** Store recipient address, subject, timestamps, user agent,
   country. Never the email body. Tokens are stored hashed.
8. **Tests and type checks pass before deploy:** `npm run check` in each package.

## Layout

```
shared/contracts.ts        API types, ID rules, tracking paths, cookie name (both sides)
backend/                   Cloudflare Worker "seensy-api" + D1 "seensy"
  src/index.ts             entry: routing + error boundary
  src/routes.ts            route table
  src/app/                 router, HTTP helpers, request meta
  src/middleware/auth.ts   Bearer token → user
  src/controllers/         HTTP in/out
  src/services/            business rules (+ pure verdict.ts, link-kind.ts)
  src/models/              SQL, one file per table
  src/schemas/             zod request schemas
  migrations/              D1 migrations (never edit an applied one; add a new file)
  scripts/create-user.mjs  creates a user and prints their API token once
  test/                    vitest unit tests for pure logic
frontend/extension/        Chrome MV3 extension (InboxSDK), built with esbuild
  src/background/          service worker: ApiClient, outbox, notifications, messages
  src/content/             in-Gmail: compose tracking, link rewriting, own-view guard, ticks
  src/popup/               toolbar popup (connect, default tracking, recent activity)
  src/shared/              extension-only helpers (messages, settings, ids, formatting)
  static/                  manifest, popup HTML/CSS, icons
```

Legacy (phase 0, still in daily use until the extension replaces it) lives outside this repo
in `../job-outreach/`: the Python sender, its contact list and sent log, and the `tracker/`
Worker (`outreach-tracker`). It holds personal data and credentials, so it is never copied
into this repo. Do not change its behaviour while the outreach campaign runs.

## Commands

| Where | Command | Does |
|---|---|---|
| backend | `npm run check` | typecheck + unit tests |
| backend | `npm run db:migrate` | apply D1 migrations (remote) |
| backend | `npm run deploy` | deploy the Worker |
| backend | `npm run user:create -- you@gmail.com` | create a user, print API token |
| extension | `npm run check` | typecheck + unit tests |
| extension | `npm run build` / `npm run dev` | build to `dist/` / rebuild on change |

## Verdicts (how a hit is judged)

| Verdict | Rule |
|---|---|
| `self` | owner viewed it (a self-view within ±20 s) or clicked with the owner cookie |
| `scanner` | known security-scanner user agent, or two different links in one email clicked within 2 s |
| `early` | within 60 s of sending: could be a scanner or a fast human; shown separately |
| `person` | everything else; the number users see |

## Design tokens (popup, labels, future dashboard)

Accent `#1F57F0` (dark `#7097FF`) = opened · Click `#A86200` (dark `#F2A845`) ·
Bad `#BF3328` · Ink `#14161B` · Muted `#5A6070` · Line `#D8DCE3` · Surface `#FFFFFF` /
dark `#161920`. Extension pages use the system font stack (no remote fonts in MV3 pages).
