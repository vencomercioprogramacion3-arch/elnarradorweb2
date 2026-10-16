# Claude Context: narrador-web

## Project Overview
- Editorial website for `El Narrador de Mexico`.
- Single `Next.js` app that serves both the public news site and the `/admin` panel.
- Main content domains are `news`, `magazines`, and `categories`.
- Data is stored in a MySQL database on Neubox hosting (managed with phpMyAdmin). There is also a WordPress migration path for importing legacy content.

## Tech Stack
- `Next.js 15.5.x` App Router
- `React 18`
- `TypeScript`
- `Tailwind CSS v4`
- `MySQL` (Neubox) via `mysql2`
- `OpenNext` targeting `Cloudflare`

## Runtime And Deployment
- Local dev entrypoint: `npm run dev`
- Build for Cloudflare/OpenNext: `npm run build`
- Plain Next build: `npm run build:next`
- Preview Pages output locally: `npm run preview`
- Deploy command: `npm run deploy`
- Cloudflare config lives in `wrangler.toml` and `open-next.config.ts`

## Source Of Truth
- Primary source folders:
  - `src/`
  - `public/`
  - `package.json`
  - `next.config.ts`
  - `open-next.config.ts`
  - `wrangler.toml`
- Generated or deployment output. Do not rely on these as authoritative source:
  - `.next/`
  - `.open-next/`
  - `deploy/`
  - `deploy-pages/`
  - `deploy_me/`
  - `out/`
  - `node_modules/`

## High-Level Folder Map
- `src/app/`: routes, layouts, metadata, route handlers, server actions
- `src/components/`: reusable public UI and SEO helpers
- `src/lib/`: MySQL access, admin session, Neubox uploads and WordPress migration logic
- `src/middleware.ts`: request header propagation
- `public/`: static assets and hosting headers

## Environment Variables Actually Used
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `AUTH_SECRET` (signs the admin session cookie)
- `NEUBOX_UPLOAD_URL`, `NEUBOX_UPLOAD_KEY` (file uploads to the Neubox host)
- `NEXT_PUBLIC_SITE_URL`
- `WORDPRESS_API_URL`
- `MIGRATION_SECRET_KEY`
- Optional Cloudflare Hyperdrive binding `HYPERDRIVE` (see `wrangler.toml`)

Do not copy secrets into documentation. Only document names and purpose.

## Monetization (Google AdSense)
- The AdSense loader script lives in `src/components/ads/AdSenseScript.tsx` and is mounted only on public pages from `src/app/layout.tsx`.
- Shared config (publisher ID and manual ad slot IDs) lives in `src/lib/ads/config.ts`. It uses no environment variables, so it works in production with no extra setup.
- Reusable manual ad blocks use `src/components/ads/AdUnit.tsx`. An `<AdUnit />` with an empty slot renders nothing, so no empty ad boxes appear and Auto Ads keep working.
- `public/ads.txt` authorizes Google to serve ads for this publisher.
- The publisher ID is also emitted as a `google-adsense-account` meta tag for site verification.

## Main Routes And Responsibilities
- `/`: homepage with latest news, featured news, most viewed news, and magazine teaser content
- `/[category]`: category listing
- `/articulo/[id]`: article detail page with dynamic metadata and JSON-LD
- `/buscar`: search results page
- `/revistas`: magazine listing
- `/revistas/[id]`: magazine detail and PDF viewer
- `/admin`: admin dashboard
- `/admin/login`: login page
- `/admin/notas`: news management list
- `/admin/notas/nueva`: create a news entry
- `/admin/revistas/nueva`: create a magazine entry
- `/admin/migrate`: trigger WordPress migration flow
- `/api/migrate`: migration API endpoint guarded by `MIGRATION_SECRET_KEY`

## Data Sources
- MySQL on Neubox is the primary live data source. Schema: `neubox/schema.sql`; setup guide: `neubox/README.md`.
- Connection helper: `src/lib/db/mysql.ts` (`query`, `queryOne`, `execute`; always use `?` placeholders).
- WordPress import code lives in `src/lib/wordpress/migrate.ts`.
- Migration endpoint lives in `src/app/api/migrate/route.ts`.
- Public article and magazine reads are handled through `src/lib/db/queries.ts` and `src/lib/db/magazines.ts`.
- Admin auth lives in `src/lib/auth/session.ts`; uploads go through `src/lib/storage/neubox.ts` to `neubox/media/upload.php`.

## Cross-Cutting Runtime Behavior
- `src/middleware.ts` forwards the current pathname through `x-invoke-path`.
- `src/app/layout.tsx` uses `x-invoke-path` to avoid rendering the public navbar/footer for `/admin` routes.
- `src/app/admin/layout.tsx` enforces auth via `getCurrentAdmin()` (signed cookie + `admin_users` lookup).

## Important Warnings
- Builds enforce ESLint and TypeScript (`npm run lint` / `npm run typecheck` run the same checks).
- Admin server actions in `src/app/admin/actions.ts` must keep calling `requireAdmin()`: they are public POST endpoints with full database access. `requireAdmin()` lives in `src/lib/auth/session.ts`.
- The El Narrador mobile app still uses Supabase; the website no longer shares data with it. See `docs/DATABASE.md` before changing the schema.

## Safe Change Guidance
- Put route and page behavior in `src/app/`.
- Put reusable rendering logic in `src/components/`.
- Put data access and external integrations in `src/lib/`.
- Avoid editing generated output folders.
- Prefer reading `src/app/layout.tsx`, `src/middleware.ts`, and `src/lib/db/*` before changing behavior that spans public and admin flows.

## Suggested Reading Order
1. `package.json`
2. `next.config.ts`
3. `src/middleware.ts`
4. `src/app/layout.tsx`
5. `src/app/CLAUDE.md`
6. `src/lib/CLAUDE.md`
7. `src/components/CLAUDE.md`
8. `public/CLAUDE.md`
