# Claude Context: src/app

## App Router Structure
- `src/app/layout.tsx`: root layout, global metadata, public chrome switching
- `src/app/page.tsx`: homepage
- `src/app/[category]/page.tsx`: category pages
- `src/app/articulo/[id]/page.tsx`: article detail
- `src/app/buscar/page.tsx`: search page
- `src/app/revistas/page.tsx`: magazine index
- `src/app/revistas/[id]/page.tsx`: magazine detail and embedded PDF
- `src/app/admin/`: admin routes and layout
- `src/app/api/migrate/route.ts`: migration endpoint
- `src/app/robots.ts`: robots output
- `src/app/sitemap.ts`: sitemap output
- `src/app/not-found.tsx`: fallback UI

## Public Routes
- `/`
  - Fetches latest news, featured news, breaking news, most viewed news, and magazines
  - Uses dynamic imports for below-the-fold sections
- `/[category]`
  - Category listing driven by `category_slug`
- `/articulo/[id]`
  - Reads one article by id
  - Generates dynamic metadata
  - Emits article JSON-LD
- `/buscar`
  - Search UI backed by `searchNews`
- `/revistas`
  - Magazine listing
- `/revistas/[id]`
  - Reads one magazine by id
  - Generates dynamic metadata
  - Renders an iframe PDF viewer

## Admin Routes
- `/admin`
  - Dashboard overview
- `/admin/login`
  - Login page
- `/admin/notas`
  - News management list
- `/admin/notas/nueva`
  - Create news form
- `/admin/revistas/nueva`
  - Create magazine form
- `/admin/migrate`
  - Manual migration trigger UI

## Route Handlers And Actions
- `src/app/api/migrate/route.ts`
  - POST endpoint
  - Checks `MIGRATION_SECRET_KEY`
  - Calls `src/lib/wordpress/migrate.ts`
- `src/app/admin/actions.ts`
  - Owns login/logout
  - Owns news upload flow
  - Owns magazine upload flow
  - Owns admin news list actions (list, feature/breaking toggles, delete)
  - Writes to MySQL via `src/lib/db/mysql.ts` and uploads files via `src/lib/storage/neubox.ts`

## Metadata And SEO Behavior
- `src/app/layout.tsx` defines site-wide metadata defaults.
- `src/app/articulo/[id]/page.tsx` generates detail metadata per article.
- `src/app/revistas/[id]/page.tsx` generates detail metadata per magazine.
- `src/app/buscar/page.tsx` and category routes also define route-specific metadata.
- `src/app/robots.ts` and `src/app/sitemap.ts` are part of the SEO surface.

## Revalidation And Caching
- Several public routes export `revalidate = 300`.
- This includes the homepage, category pages, article detail, magazine listing, and magazine detail.
- Admin actions call `revalidatePath(...)` after writes.

## Auth And Guard Behavior
- `src/app/layout.tsx` reads `x-invoke-path` to decide whether to render public navbar/footer.
- `src/app/admin/layout.tsx` protects admin routes with `getCurrentAdmin()` (signed cookie + `admin_users` row).
- `src/middleware.ts` makes the current path visible to server components.

## Notes On Dynamic Routes
- `src/app/[category]/page.tsx` maps category slugs to UI labels and metadata.
- `src/app/articulo/[id]/page.tsx` expects an article id that exists in the `news` table.
- `src/app/revistas/[id]/page.tsx` expects a magazine id that exists in the `magazines` table.
- Dynamic route params are awaited in these files because params are typed as `Promise<{ ... }>` in the current codebase.

## Read This Before Editing Routes
- Read `src/app/layout.tsx`
- Read `src/middleware.ts`
- Read `src/app/admin/layout.tsx`
- Read `src/app/admin/actions.ts`
- Read the relevant query module under `src/lib/db/`
