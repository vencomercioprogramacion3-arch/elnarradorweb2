# Claude Context: src

## Purpose Of `src/`
- `src/` contains the authoritative application code.
- Keep route composition in `src/app/`.
- Keep reusable presentation components in `src/components/`.
- Keep data access and third-party integration code in `src/lib/`.
- Keep request-wide auth/header behavior in `src/middleware.ts`.

## Folder Ownership Map
- `src/app/`
  - App Router pages, layouts, metadata, route handlers, server actions
- `src/components/`
  - Reusable UI for the public site
- `src/lib/`
  - MySQL access (`db/`), admin session (`auth/`), uploads (`storage/`), queries, typed content access, WordPress migration helpers
- `src/middleware.ts`
  - Propagates pathname via `x-invoke-path`

## Import Conventions
- The project uses alias imports rooted at `@/`.
- Common examples:
  - `@/components/...`
  - `@/lib/...`
- Prefer alias imports over long relative imports when working across folders.

## Cross-Cutting Concerns
- Public and admin routes share the same app and middleware.
- Admin auth is a signed session cookie handled by `src/lib/auth/session.ts`.
- Metadata and SEO behavior are defined inside route files and shared helpers.
- Some routes are server-rendered and admin client screens talk to the database only through server actions.

## Where To Implement Common Changes
- Add or change a route: `src/app/`
- Change shared public UI: `src/components/`
- Change data fetching or persistence: `src/lib/`
- Change request/session behavior: `src/middleware.ts`
- Change admin form submission logic: `src/app/admin/actions.ts`

## Working Notes
- Prefer keeping business logic out of presentation components when it can live in `src/lib/` or server actions.
- The admin area mixes server-rendered shells and client-side interactions.
- The public site relies heavily on server data fetching and route-level metadata.

## Related Context Files
- `src/app/CLAUDE.md`
- `src/components/CLAUDE.md`
- `src/lib/CLAUDE.md`
