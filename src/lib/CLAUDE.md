# Claude Context: src/lib

## Purpose
- `src/lib/` contains the data-access layer and external integration code.
- This is the main place to inspect before changing queries, storage behavior, migration logic, or shared content types.

## Database (MySQL on Neubox)
- `src/lib/db/mysql.ts`
  - `query`, `queryOne`, `execute` helpers on top of `mysql2/promise`; always use `?` placeholders
  - On Cloudflare Workers: one connection per query, via the `HYPERDRIVE` binding if present, else `MYSQL_*` env vars
  - On Node (`next dev`, build): a global pool
  - Dates are stored in UTC and returned as ISO strings; `TINYINT(1)` is returned as boolean
- Schema: `neubox/schema.sql`. Setup and data migration guide: `neubox/README.md`.

## Data Models
- `src/lib/db/queries.ts`
  - Defines `NewsArticle` and `Author`
  - Read helpers for latest, featured, breaking, category, by-id, search, categories, most-viewed, authors
  - `getNewsById` throws when the row does not exist (pages rely on that to 404)
- `src/lib/db/magazines.ts`
  - Defines `Magazine`; list, by-id (throws if missing) and featured helpers
- `src/lib/db/admin-users.ts`
  - `admin_users` CRUD; only `getAdminCredentials` selects `password_hash`

## Auth
- `src/lib/auth/session.ts`
  - PBKDF2 password hashing (Web Crypto, max 100k iterations because of Workers)
  - HMAC-signed httpOnly session cookie (`AUTH_SECRET`)
  - `getCurrentAdmin()` and `requireAdmin()`; every admin server action must call `requireAdmin()`

## File Uploads
- `src/lib/storage/neubox.ts` POSTs files to `neubox/media/upload.php` on the Neubox host with the `X-Upload-Key` header
- News images go to `uploads/news/`, magazine covers and PDFs to `uploads/magazines/`
- Older media URLs still point to Supabase storage
- `src/lib/legacy-media.ts` rewrites old WordPress image URLs (`elnarradordemexico.com/wp-content/...`, `i0.wp.com/...`) to `LEGACY_WP_ORIGIN` (a Neubox subdomain); `toArticle` applies it to `image_url` and `content`, and `next.config.ts` redirects `/wp-content/*` there

## YouTube Integration
- `src/lib/youtube/config.ts`
  - `YOUTUBE_CHANNEL` (handle), optional `YOUTUBE_CHANNEL_ID` (UC..., skips handle resolution) and `YOUTUBE_CHANNEL_URL` constants (no env vars, same pattern as ads config)
  - With both channel values empty the homepage video section renders nothing
- `src/lib/youtube/feed.ts`
  - `getLatestVideos(limit)` resolves the channel id from the handle (cached 24h) and reads the channel's public RSS feed (no API key)
  - Returns `[]` on any failure so the homepage never breaks because of YouTube

## WordPress Migration Utilities
- `src/lib/wordpress/migrate.ts`
  - Fetches categories and posts from the WordPress REST API
  - Normalizes HTML/plain-text fields
  - Upserts records into MySQL (`INSERT ... ON DUPLICATE KEY UPDATE`)
- `src/app/api/migrate/route.ts`
  - Is the route-level entrypoint that calls the migration utility

## Security And Secret Handling
- Document names of secrets only. Do not paste values.
- `MYSQL_PASSWORD`, `AUTH_SECRET` and `NEUBOX_UPLOAD_KEY` must stay server-only.
- `MIGRATION_SECRET_KEY` protects the migration endpoint.

## Environment Variables Used By This Layer
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
- `AUTH_SECRET`
- `NEUBOX_UPLOAD_URL`, `NEUBOX_UPLOAD_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `WORDPRESS_API_URL`
- `MIGRATION_SECRET_KEY`

## Tables And Content Domains
- `news`, `magazines`, `categories`, `admin_users`, `authors`, `news_authors`

## Read This Before Changing Data Logic
- `src/lib/db/mysql.ts`
- `src/lib/db/queries.ts`
- `src/lib/db/magazines.ts`
- `src/lib/auth/session.ts`
- `src/app/admin/actions.ts`
- `src/lib/wordpress/migrate.ts`
