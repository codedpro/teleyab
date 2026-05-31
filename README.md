# TeleYab — Telegram Username → Phone Lookup

> RTL SaaS that turns a Telegram `@username` or numeric ID into the
> mobile phone number behind it. Wallet billing in Toman, card-to-card top-ups,
> pay-per-success model (failed lookups cost zero), Bearer-token API for
> developers, full admin operations dashboard.
>
> Built end-to-end as a monorepo: Next.js 16 / React 19 / Tailwind v4 web
> client + Go 1.23 / chi / pgx API + PostgreSQL 16, orchestrated with
> Docker Compose. RTL throughout, lazy-loaded GSAP motion,
> 14 JSON-LD schema blocks on the landing page, AI-Overview-friendly
> `llms.txt`, security headers, and structured per-page metadata.

<p align="center">
  <a href="#"><img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=nextdotjs"></a>
  <a href="#"><img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?style=flat&logo=react"></a>
  <a href="#"><img alt="Tailwind v4" src="https://img.shields.io/badge/Tailwind-v4-38bdf8?style=flat&logo=tailwindcss"></a>
  <a href="#"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat&logo=typescript"></a>
  <a href="#"><img alt="Go 1.23" src="https://img.shields.io/badge/Go-1.23-00add8?style=flat&logo=go"></a>
  <a href="#"><img alt="Postgres 16" src="https://img.shields.io/badge/Postgres-16-336791?style=flat&logo=postgresql"></a>
  <a href="#"><img alt="RTL" src="https://img.shields.io/badge/lang-fa--IR%20RTL-229ED9?style=flat"></a>
  <a href="#"><img alt="License" src="https://img.shields.io/badge/license-proprietary-lightgrey?style=flat"></a>
</p>

<p align="center"><strong>
  #telegram · #osint · #lookup · #phone-lookup · #username-to-phone ·
  #rtl · #nextjs · #react · #tailwindcss · #typescript · #golang ·
  #postgres · #docker · #gsap · #chat-ui · #seo · #ai-overviews · #llms-txt · #saas
</strong></p>

---

## Table of contents

- [What it does](#what-it-does)
- [Live screenshots](#live-screenshots)
- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Run locally](#run-locally)
- [Environment](#environment)
- [API surface](#api-surface)
- [Pricing model](#pricing-model)
- [Referral program](#referral-program)
- [SEO + AI search](#seo--ai-search)
- [Design system](#design-system)
- [Performance](#performance)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## What it does

- **Single lookup** — paste an `@username` or numeric Telegram ID, get the phone number
  plus (when available) name, email, previous usernames, birthday, country.
- **Batch lookup** — up to 500 rows per submission. Same per-row pricing.
  Failures cost nothing.
- **Bearer-token API** — `POST /api/v1/lookup` with the same wallet billing.
  curl-friendly, JSON in/out.
- **Wallet** — top up in Toman via card-to-card with an admin approval step.
  Transparent ledger of every charge and credit.
- **Referrals** — both sides receive 200,000 Toman once the referred user's
  **first top-up is approved**.
- **Admin** — operator dashboard for users, payments, refunds, abuse flags,
  upstream providers, resellers, settings.

The product is positioned as **its own database** of Telegram identity
mappings. There is no live integration claim, no upstream-provider language
in user-facing copy, no marketing about Iranian customers (the audience is
inferred from the language and currency, not stated).

## Live screenshots

The home page uses a looping chat-style demo where the user sends an
`@username` and TeleYab "replies" with phone + email + previous usernames +
birthday — Telegram-flavoured bubbles, typing indicators, magnetic CTAs.
GSAP drives all scroll-revealed sections.

Run the stack locally (below) and visit:

- `/` — landing + live demo
- `/pricing` — live price + quick-charge presets (login-gated)
- `/lookup` — Telegram-chat composer (auth required)
- `/batch` — bulk upload
- `/keys` — API token issuance
- `/referral` — invite link + earnings

## Stack

| Piece            | Tech                                              | Port |
| ---------------- | ------------------------------------------------- | ---- |
| Web              | Next.js 16, React 19, Tailwind v4, TypeScript     | 4102 |
| Web motion       | GSAP 3 + ScrollTrigger (lazy-loaded)              | —    |
| API              | Go 1.23, chi router, pgx                          | 8084 |
| DB               | PostgreSQL 16 (Alpine, in Docker)                 | 5436 |
| Auth             | Email + password, magic-link verification         | —    |
| Payments         | Card-to-card with admin approval                  | —    |
| Sessions         | Server-issued, HttpOnly cookies                   | —    |
| Orchestration    | Docker Compose                                    | —    |

Everything is wired via `docker compose up -d --build`.

## Repository layout

```
.
├── cmd/server/          # Go entrypoint
├── internal/
│   ├── config/          # env loading + first-run defaults
│   ├── db/              # pgx wrappers, schema.sql, seed
│   ├── handlers/        # chi route handlers (auth, lookup, admin, …)
│   ├── session/         # cookie + DB-backed sessions
│   └── …
├── web/
│   ├── app/             # Next.js 16 app router pages + routes
│   │   ├── (public)     # /, /pricing, /privacy, /terms, /llms.txt, …
│   │   ├── (auth)       # /login, /verify
│   │   ├── (dashboard)  # /lookup, /batch, /keys, /wallet, /topup, /referral
│   │   └── admin/       # operator UI (8 pages)
│   ├── components/      # nav, footer, chat primitives, schema-ld, …
│   ├── lib/             # motion (lazy GSAP), cn, ref-capture, …
│   └── public/
├── docker-compose.yml
├── Dockerfile.api
├── go.mod
├── PLAN.md              # architecture + roadmap
├── CLAUDE.md            # operator guard-rails (token-burn warning, etc.)
└── README.md            # this file
```

## Run locally

You need Docker + Docker Compose. **Do not run a fresh build against the
production upstream key** — see [CLAUDE.md](CLAUDE.md) for the token-burn
warning.

```bash
# clone
git clone https://github.com/codedpro/teleyab.git
cd teleyab

# copy env template + fill in secrets
cp .env.example .env
$EDITOR .env

# bring up everything (web on :4102, api on :8084, postgres on :5436)
docker compose up -d --build

# verify
curl -s http://127.0.0.1:4102/api/public/pricing
open http://127.0.0.1:4102
```

The first boot seeds default settings into the `settings` table:

- `price_per_lookup_toman` = `800000`
- `min_topup_toman` = `800000`
- `max_topup_toman` = `25000000`
- `referral_bonus_toman` = `200000`

Adjust live from the admin UI at `/admin/settings`. The first user to sign up
is automatically promoted to `admin` in the DB (or run
`UPDATE users SET role='admin' WHERE id=1;`).

## Environment

`.env.example` is the source of truth. Required keys, condensed:

| Key                       | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `DATABASE_URL`            | Postgres DSN (`postgres://teleyab:teleyab@…`)      |
| `WEB_ORIGIN`              | Used to construct referral share URLs              |
| `SESSION_COOKIE_DOMAIN`   | Empty for local; set to root domain in prod       |
| `RESEND_API_KEY`          | Magic-link email delivery                          |
| `UPSTREAM_*`              | Provider configuration (see PLAN.md §10)           |
| `NEXT_PUBLIC_SITE_URL`    | Canonical origin (web side)                        |

Never commit a real `.env` — it's in `.gitignore` and reading it counts as
exfiltration in the security policy.

## API surface

All routes mounted under `/api`. Authenticated routes require a session
cookie; the public Bearer route accepts `Authorization: Bearer <token>`.

### Public

| Method | Path                          | Notes                                       |
| ------ | ----------------------------- | ------------------------------------------- |
| GET    | `/healthz`                    | Liveness probe                              |
| GET    | `/public/pricing`             | Live `price_per_lookup_toman`, min/max top-up, referral bonus |

### Auth

| Method | Path                  | Notes                                       |
| ------ | --------------------- | ------------------------------------------- |
| POST   | `/auth/register`      | Email + password + optional `ref_code`      |
| POST   | `/auth/login`         | Returns session cookie                      |
| POST   | `/auth/verify-email`  | Consumes verification token                 |
| POST   | `/auth/logout`        |                                             |

### User (session required)

| Method | Path                          | Notes                                       |
| ------ | ----------------------------- | ------------------------------------------- |
| GET    | `/me`                         | Profile + balance + price                   |
| POST   | `/lookup`                     | Web-side single lookup (`min_balance` gate) |
| GET    | `/lookups`                    | History (no upstream call)                  |
| POST   | `/topup/request`              | Card-to-card submission with receipt        |
| GET    | `/topup/requests`             | Own top-up history                          |
| GET    | `/me/referral`                | Own code, share URL, invited count, earned  |
| POST   | `/lookup/batch`               | Up to 500 rows per submission               |
| GET    | `/lookup/batch/{id}`          | Per-batch status + per-row results          |
| GET    | `/keys` / POST `/keys`        | List / create Bearer tokens                 |
| DELETE | `/keys/{id}`                  | Revoke                                      |

### Public Bearer API

| Method | Path             | Notes                                       |
| ------ | ---------------- | ------------------------------------------- |
| POST   | `/v1/lookup`     | Bearer-auth equivalent of web `/lookup`     |

Example:

```bash
curl -X POST https://teleyab.ir/api/v1/lookup \
  -H "Authorization: Bearer $TELEYAB_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "query": "@arman_dev" }'
# → { "success": true,
#     "numbers": ["+989124528521"],
#     "country": "IR",
#     "cost_toman": 800000,
#     "balance_toman": 49200000 }
```

### Admin (role=admin)

`/admin/stats`, `/admin/users`, `/admin/users/{id}/{ban,unban,force-logout,adjust}`,
`/admin/refunds`, `/admin/refunds/{id}/{resolve,reject}`, `/admin/flags`,
`/admin/providers` (CRUD + toggle), `/admin/payments` (approve / reject),
`/admin/resellers`, `/admin/settings`, `/admin/upstream-balance`.

## Pricing model

- **Per successful lookup**: `settings.price_per_lookup_toman` (default 800,000 ﺗﻮﻣﺎن).
- **Failed lookup**: 0 Toman. No wallet debit.
- **Minimum top-up**: matches the per-lookup price (800,000 by default).
- **Currency**: Iranian Toman (IRT).

User-facing pages always read the live value from `/api/public/pricing` so the
admin can change pricing without redeploying.

## Referral program

- Friend signs up with `?ref=<code>` or enters the code manually.
- `web/components/ref-capture.tsx` writes the code to `localStorage`
  (30-day TTL) on any page load, then strips the query so URLs stay clean.
- `/login` falls back to that storage when its own `?ref=` is absent.
- Server attaches `users.referred_by` on the friend's first verified login.
- Bonus (200,000 Toman default) is credited to **both wallets** when the
  friend's **first top-up is approved by an admin** — not on first lookup.
- Idempotent: `users.referral_bonus_paid` guards against double-pay.
- Defensive: skips payout if the referrer is `banned_at`, `flagged_at`,
  or `is_active=false`.

## SEO + AI search

The site ships an aggressive on-page + technical SEO baseline:

- **`robots.txt`** — explicit allow for GPTBot, ClaudeBot, PerplexityBot,
  Google-Extended, OAI-SearchBot, Applebot-Extended, Bingbot, CCBot,
  cohere-ai, Meta-ExternalAgent; disallow on private routes (`/admin`,
  `/wallet`, `/topup`, `/verify`, `/api`, `/login`).
- **`sitemap.xml`** — 8 public routes with realistic priorities + static lastmod.
- **`llms.txt` + `llms-full.txt`** — llmstxt.org format dump for AI Overviews,
  Perplexity, ChatGPT, etc. Includes FAQ verbatim, full HowTo, prose
  excerpts of privacy + terms.
- **`humans.txt`** — humanstxt.org credits.
- **`.well-known/security.txt`** — RFC 9116 contact.
- **`feed.xml`** — RSS 2.0 of the FAQ items.
- **JSON-LD** — Organization, WebSite (with SearchAction), Service,
  WebApplication (with AggregateRating / Offer / UnitPriceSpecification),
  BreadcrumbList, FAQPage, HowTo, SiteNavigationElement, WebPage
  (TermsOfService / PrivacyPolicy variants). 14 distinct schema blocks on the
  home page alone.
- **Security headers** — HSTS, COOP, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, baseline `X-Robots-Tag: index, follow,
  max-image-preview:large, max-snippet:-1` with per-route `noindex,nofollow`
  override on dashboard / auth / API.
- **Per-page metadata** — every public route exports its own title,
  description, canonical, OG, and Twitter card.

## Design system

- **Palette** — Telegram-blue accent (`#229ED9`), light surface, jade success,
  rose danger, saffron highlight. Variable names preserved
  (`--color-persimmon`, `--color-bone`) for backward compatibility with the
  pre-rebrand pages.
- **Typography** — Vazirmatn (two weights preloaded as woff2),
  Inter (Latin sans), JetBrains Mono (code). Font-display: swap.
- **Components** — `t-card`, `t-btn`, `t-input`, `t-chip` primitives in
  `globals.css`; chat primitives (`ChatBubble`, `ChatStream`, `ChatShell`,
  `TypingDots`, `LiveChatDemo`) in `web/components/chat.tsx`.
- **Motion** — `web/lib/motion.tsx` exports `ScrollReveal`, `StaggerChildren`,
  `CountUp`, `MagneticHover`, `ParallaxBlob`, `Typewriter`, `useGsap`,
  `loadGsap`. GSAP is lazy-loaded — never in the critical client graph.
- **RTL** — `dir="rtl"` on `<html>`, logical CSS properties
  (`start`/`end`/`ps`/`pe`) used everywhere. Inputs that accept LTR data
  (emails, card numbers, queries) wrap in `dir="ltr"` to keep icon
  positioning and padding aligned.

## Performance

- GSAP + ScrollTrigger lazy-loaded behind a `loadGsap()` singleton —
  `prefers-reduced-motion` users skip the import entirely.
- Vazirmatn Regular + Bold preloaded as woff2 (cuts one RTT on RTL copy).
- DNS prefetch + preconnect for all font hosts.
- `content-visibility: auto` on long sections; GPU promotion on animated blobs.
- Next.js standalone build behind a slim Alpine container.

## Security

- HttpOnly session cookies; CSRF surface minimised by same-site cookies +
  origin-pinned sessions.
- Open-redirect defence: `/login?next=` validated to start with a single `/`.
- `maybeApplyReferralBonus` is transactional and idempotent.
- Admin routes gated by `users.role='admin'` + a session check.
- Receipt uploads stored under `/uploads/receipts/{filename}` with the
  filename generated server-side from a timestamp + random hex.
- Token-burn guard: the `/api/lookup` and `/api/v1/lookup` paths cost real
  upstream credits — see [CLAUDE.md](CLAUDE.md) for the operational rules.

## Contributing

This repository is currently maintained by a single operator
([@codedpro](https://github.com/codedpro)). Issues and PRs are welcome for
documentation fixes, accessibility regressions, RTL copy refinements,
and obvious bugs. Feature requests outside the
[non-goals section of PLAN.md](PLAN.md#2-what-this-is-not-deliberate-non-goals)
will likely be closed without comment.

Before opening a PR:

```bash
cd web && npm run typecheck     # TypeScript strict
cd web && npm run build         # Next.js production build
cd .. && go build ./...         # Go API
```

## License

Proprietary. All rights reserved. Source is published for transparency and
self-hosting reference only; redistribution, commercial reuse, or
hosting a competing service without written permission is not licensed.

— TeleYab · ۱۴۰۵
