# SEO Design — RELOAD Downloader

## Goal
Rank for queries like "download video tiktok tanpa wm/watermark" and "downloader video tanpa wm".

## Approach
The app is a single client-rendered page, which gives search engines nothing to index beyond
the tool UI. Rather than building a CMS/blog (no content pipeline exists, out of scope), we:

1. **Metadata** (`src/app/layout.tsx`, server component): keyword-rich title/description/keywords,
   canonical URL, OpenGraph + Twitter cards, all targeting the exact requested search phrases.
2. **Structured data**: `WebApplication` JSON-LD injected in `<body>` via `dangerouslySetInnerHTML`
   (static JSON, no user input — safe).
3. **robots.txt / sitemap.xml**: Next.js file-convention generators (`src/app/robots.ts`,
   `src/app/sitemap.ts`), disallowing `/admin` and `/api`, pointing to the homepage.
4. **Indexable content**: `src/components/SeoContent.tsx`, a server component rendered after
   `{children}` in the root layout. Contains semantic `h1`/`h2`/`h3` copy in Indonesian covering
   TikTok/Instagram/Facebook/YouTube use cases and an FAQ block, naturally including target
   keywords. Rendered server-side so crawlers see it without JS execution.

## Out of scope
- Backlink building, Search Console submission, and ranking position itself — these depend on
  external factors (domain age, backlinks, real traffic) outside code changes.
- Per-platform dedicated landing pages (e.g. `/tiktok`, `/instagram`) — not built; single-page
  content block was chosen to avoid scope creep, can be added later if needed.

## Verification
- `npm run build` succeeds; `/`, `/robots.txt`, `/sitemap.xml` all prerender as static.
- Confirmed via curl: `<title>` matches target keyword phrase, JSON-LD present, robots.txt
  disallows `/admin` and `/api` and references the sitemap.
