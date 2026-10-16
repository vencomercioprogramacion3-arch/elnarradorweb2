# Claude Context: public

## Purpose
- `public/` contains static files served directly by the app.
- URLs map directly from this folder structure.

## Current Contents
- `public/images/`
  - Editorial and branding assets used by the site
- `public/_headers`
  - Hosting/CDN-related headers configuration
- Generic starter assets still present:
  - `public/file.svg`
  - `public/globe.svg`
  - `public/next.svg`
  - `public/vercel.svg`
  - `public/window.svg`

## Referenced Static Assets
- `public/images/banner-narrador.jpg`
  - Preloaded in `src/app/layout.tsx`
  - Used by the homepage hero area
- `public/images/editorial-section.jpg`
  - Used by editorial section UI
- `public/images/logo-horizontal-blanco.png`
  - Branding asset
- `public/images/revista-1.jpg`
- `public/images/revista-2.jpg`
- `public/images/revista-3.jpg`

## Files With Deployment Impact
- `public/_headers`
  - May affect behavior on supported hosting/CDN targets
  - Review carefully before modifying

## Working Guidance
- Keep public asset URLs stable when possible.
- If you rename or move an asset, update all route/component references that depend on it.
- Do not store secrets, generated artifacts, or source code in `public/`.
- Prefer placing editorial images in `public/images/` unless there is a reason to load them from the Neubox uploads folder instead.

## Relationship To Runtime Assets
- Some images are local static assets from `public/`.
- Other media is uploaded to the Neubox host (`/media/uploads/...`) and referenced by remote URL; older media still lives in Supabase storage.
- Check `next.config.ts` remote image patterns before introducing new remote image hosts.
