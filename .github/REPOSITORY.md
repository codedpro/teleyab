# Repository metadata

When you push this repo to GitHub for the first time, apply these settings
via the web UI or with `gh` (commands below).

## Description (≤ 350 chars)

> RTL Telegram username → phone-number lookup service. Pay only
> when we find a result. Wallet billing in Toman, card-to-card top-ups,
> Bearer-token API for developers. Built with Next.js 16, React 19,
> Tailwind v4, Go 1.23 and PostgreSQL 16.

## Website

```
https://teleyab.ir
```

## Topics (a.k.a. "hashtags" — GitHub allows up to 20)

```
telegram
osint
phone-lookup
username-to-phone
lookup-service
rtl
nextjs
react
tailwindcss
typescript
golang
postgres
docker
gsap
chat-ui
seo
ai-overviews
llms-txt
saas
```

## One-shot apply (after the remote exists)

```bash
# create the remote — public, with description + homepage in one shot
gh repo create codedpro/teleyab \
  --public \
  --source=. \
  --remote=origin \
  --description "RTL Telegram username → phone-number lookup service. Pay only when we find a result. Wallet billing in Toman, card-to-card top-ups, Bearer-token API. Next.js 16 / React 19 / Tailwind v4 / Go 1.23 / Postgres 16." \
  --homepage "https://teleyab.ir" \
  --push

# topics (one call, 20 tags)
gh repo edit codedpro/teleyab \
  --add-topic telegram \
  --add-topic osint \
  --add-topic phone-lookup \
  --add-topic username-to-phone \
  --add-topic lookup-service \
  --add-topic rtl \
  --add-topic nextjs \
  --add-topic react \
  --add-topic tailwindcss \
  --add-topic typescript \
  --add-topic golang \
  --add-topic postgres \
  --add-topic docker \
  --add-topic gsap \
  --add-topic chat-ui \
  --add-topic seo \
  --add-topic ai-overviews \
  --add-topic llms-txt \
  --add-topic saas

# branch protection (recommended for solo work too)
gh repo edit codedpro/teleyab --default-branch main
gh api -X PUT repos/codedpro/teleyab/branches/main/protection \
  -f required_pull_request_reviews=null \
  -F enforce_admins=false \
  -F required_status_checks=null \
  -F restrictions=null
```

## Suggested social preview

The repo already ships a 1200×630 Open Graph image at
`web/app/opengraph-image.tsx`. After the first deploy it's reachable at
`https://teleyab.ir/opengraph-image` — you can upload that PNG as the
GitHub social preview under Settings → General → Social preview.

## Notes

- The `.env` file is correctly excluded by `.gitignore`. Only `.env.example`
  is committed.
- Auditing artefacts (`FULL-AUDIT-REPORT.md`, `ACTION-PLAN.md`,
  `screenshots/`) are also ignored — keep them local.
- Production secrets must never enter Git history. If a secret slips in,
  `git filter-repo` is the only correct remediation.
