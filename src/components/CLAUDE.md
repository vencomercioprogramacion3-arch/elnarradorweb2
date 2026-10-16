# Claude Context: src/components

## Purpose
- `src/components/` holds reusable UI for the public-facing site.
- Most admin UI is not componentized here; it is mostly written inline in route files under `src/app/admin/`.

## Component Groups
- `layout/`
  - `Navbar.tsx`
  - `Footer.tsx`
  - `Sidebar.tsx`
- `news/`
  - `HeroBanner.tsx`
  - `FeaturedHero.tsx`
  - `NewsTicker.tsx`
  - `ArticleGrid.tsx`
  - `ArticleCard.tsx`
  - `CategoryBadge.tsx`
  - `EditorialSection.tsx`
  - `BreakingBanner.tsx`
- `magazines/`
  - `MagazineShowcase.tsx`
  - `MagazineCard.tsx`
- `video/`
  - `VideoSection.tsx` (server: fetches latest YouTube uploads, renders nothing if no channel configured)
  - `VideoCard.tsx` (client: thumbnail facade, loads the YouTube iframe only on click)
- `seo/`
  - `JsonLd.tsx`
- `ui/`
  - `SearchBar.tsx`
  - `DarkModeToggle.tsx`
  - `Skeleton.tsx`
  - `ReadingProgress.tsx` (client: gold scroll-progress bar used on article pages)

## Key Dependencies
- News-oriented components consume `NewsArticle` from `src/lib/db/queries.ts`.
- Magazine components consume `Magazine` from `src/lib/db/magazines.ts`.
- SEO helpers are consumed by route files in `src/app/`.
- Layout components are assembled by `src/app/layout.tsx` and page files.

## Public vs Admin
- Public-facing UI is mostly here.
- Admin-facing UI is mostly not here.
- If you are changing `/admin`, inspect `src/app/admin/*` first before creating a new shared component.

## Styling Conventions
- Components rely on utility-first styling through Tailwind classes.
- Typography and brand-level tokens are connected to global styles in `src/app/globals.css` and font setup in `src/app/layout.tsx`.
- Keep public styling consistent with the editorial/news presentation already in use.

## Reuse Guidance
- Reuse `ArticleCard`, `ArticleGrid`, and `Sidebar` before adding new article list patterns.
- Reuse `CategoryBadge` for category display in article-related surfaces.
- Reuse `JsonLd.tsx` helpers for structured data rather than inlining schema in route files.
- Keep data fetching out of presentational components when possible. Prefer passing typed data in from route files.

## Working Notes
- `NewsTicker`, `EditorialSection`, and `MagazineShowcase` are dynamically imported on the homepage.
- `Sidebar` is used for “most viewed”, “featured”, and related-news style blocks.
- `DarkModeToggle.tsx` exists, but dark-mode support is not a primary architectural feature elsewhere in the current app.

## Read This Before Editing
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/lib/db/queries.ts`
- `src/lib/db/magazines.ts`
