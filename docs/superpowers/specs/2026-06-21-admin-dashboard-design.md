# Design: Admin Dashboard (Realtime GA4 + usage analytics)

## Goal
Password-protected `/admin` area showing real-time active users (via Google
Analytics 4 Realtime Data API) and app-specific usage stats (downloads by
platform/format), plus a written list of recommended future admin features.

## Auth
- `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` env vars.
- `POST /api/admin/login` checks the password, sets an httpOnly signed
  cookie (`HMAC-SHA256(secret, "admin-session")`, hex) — stateless, so it
  works across serverless invocations without a database.
- `middleware.ts` protects everything under `/admin` (except `/admin/login`)
  by recomputing and comparing the same HMAC against the cookie.
- `POST /api/admin/logout` clears the cookie.

## GA4 integration
- Client-side: `gtag.js` loaded in `layout.tsx` when
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. Fires a custom `download` event
  with `platform` and `format` params whenever a download completes in
  `page.tsx`.
- Server-side: `@google-analytics/data` client, authenticated via
  `GA4_PROPERTY_ID` + `GOOGLE_SERVICE_ACCOUNT_EMAIL` +
  `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`.
- `/api/admin/ga/realtime` — active users right now, broken down by country
  and device category (GA4 `runRealtimeReport`).
- `/api/admin/ga/summary` — last 7 days: sessions/pageviews by day, top
  countries, device split, and `download` event counts by platform (GA4
  `runReport`). Requires the `platform`/`format` event params to be
  registered as custom dimensions in the GA4 UI — a one-time manual step
  documented in the setup guide, not automatable from code.
- If GA4 env vars are absent, both routes return a "not configured yet"
  state and the dashboard renders setup instructions instead of crashing.

## Dashboard UI (`/admin`)
- Realtime active-users counter (auto-refreshing every 15s).
- 7-day sessions/pageviews line chart.
- Downloads-by-platform bar chart (from custom events).
- Device + country breakdown tables.
- Setup banner shown until GA4 credentials are configured.

## Setup steps for the user (documented, not automatable)
1. Create a GA4 property in Google Analytics, get the Measurement ID
   (`G-XXXXXXX`) → set as `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
2. In Google Cloud Console: create a service account, enable "Google
   Analytics Data API", grant the service account "Viewer" access on the
   GA4 property (Admin → Property Access Management).
3. Set `GA4_PROPERTY_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (escaped `\n`) as Vercel env vars.
4. In GA4 UI: Admin → Custom definitions → register `platform` and `format`
   as event-scoped custom dimensions on the `download` event.

## Recommended future admin features (suggested, not built in this pass)
- Error-rate / success-rate per platform (needs server-side event logging).
- Top requested URLs/domains and broken-extractor alerts.
- Rate-limit / abuse monitor for the download API.
- Conversion funnel: visit → paste URL → download completed.
- Changelog/version banner for deployed admin builds.

## Out of scope (separate specs)
- SEO work.
- Performance / mobile-first pass.
