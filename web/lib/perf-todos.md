# Perf TODOs — images

Findings from a `grep -rn "<img"` sweep across `web/components/` and `web/app/`.
This file is owned by the perf agent; other agents working on `page.tsx` files
should pick these up.

## `<img>` tags found in off-limits files

- PERF-TODO: convert to `next/image` (or add `loading="lazy" decoding="async"`
  and explicit `width`/`height`) at
  `web/app/topup/page.tsx:318`
  — receipt preview, source is a transient data URL (`imagePreview`). Since
  it's an in-memory data URL, `next/image` is not a great fit. Minimum fix:
  add `loading="eager"`, `decoding="sync"`, and reserve a fixed
  `width`/`height` (the current `h-24 w-auto` lets it CLS until the data URL
  decodes). Suggested: pass an explicit `width={96} height={96}` (or
  whatever ratio matches the receipt) with `object-cover` already in place.

## Files audited, no `<img>` found

- All other `web/app/**/page.tsx` files
- All `web/components/*.tsx` files (route-mount.tsx, chat.tsx, nav.tsx,
  logo.tsx, schema-ld.tsx, auth-frame.tsx)

## Notes

- The site uses no public/ raster assets (verified via `ls web/public/`),
  so there is no static-asset image work pending.
- Logo SVG is inline in `components/logo.tsx`; no work needed.
