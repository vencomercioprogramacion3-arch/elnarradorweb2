# El Narrador de México — Sitio web

Sitio editorial de noticias construido con Next.js. Una sola aplicación sirve
el sitio público (noticias, revistas, búsqueda) y el panel de administración
en `/admin`.

- **Producción:** https://elnarradordemexico.com
- **Stack:** Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS v4 · MySQL (Neubox) · Cloudflare (vía OpenNext)

## Requisitos

- Node.js 20+
- npm
- Acceso a la base MySQL de Neubox (ver [`neubox/README.md`](./neubox/README.md))

## Arranque local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
#    ...y rellenar los valores (ver comentarios dentro del archivo)

# 3. Levantar el servidor de desarrollo
npm run dev
```

El sitio queda en http://localhost:3000 y el panel en http://localhost:3000/admin.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build para Cloudflare con OpenNext (el que se despliega) |
| `npm run build:next` | Build estándar de Next (verificación rápida de lint + tipos) |
| `npm run lint` | ESLint sobre `src/` |
| `npm run typecheck` | Verificación de tipos con `tsc --noEmit` |
| `npm run preview` | Build + preview local con Wrangler |
| `npm run deploy` | Build + deploy a Cloudflare Pages |

## Estructura del proyecto

```
src/
├── app/          # Rutas, layouts, metadata, server actions (App Router)
│   ├── admin/    # Panel de administración (login propio, usuarios en `admin_users`)
│   └── api/      # Route handlers (p.ej. /api/migrate)
├── components/   # UI reutilizable del sitio público (news, magazines, seo, ads, ui)
├── lib/          # Acceso a datos: MySQL (`db/`), sesión (`auth/`), subidas (`storage/`), migración WordPress
└── middleware.ts # Propaga el pathname para el layout
```

Las carpetas `deploy/`, `deploy-pages/`, `deploy_me/`, `.next/` y `.open-next/`
son salida generada — no se editan ni se commitean.

## Documentación

| Documento | Contenido |
|---|---|
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Cómo desplegar a Cloudflare, secrets y troubleshooting |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Esquema de la base MySQL y almacenamiento de archivos |
| [`neubox/README.md`](./neubox/README.md) | Configurar MySQL, archivos y migrar los datos desde Supabase |
| [`CLAUDE.md`](./CLAUDE.md) | Contexto general del proyecto (también útil para humanos) |
| `.env.example` | Variables de entorno requeridas y su propósito |

## Dominios de contenido

- **Noticias** (`news`): notas con categoría, autor, imagen destacada y flags de
  destacada/última hora. Se crean desde `/admin/notas/nueva`.
- **Revistas** (`magazines`): ediciones en PDF con portada. Se crean desde
  `/admin/revistas/nueva`.
- **Categorías**: fijas en código (`src/app/[category]/page.tsx`) y en la tabla
  `categories`.

El sitio usa su propia base MySQL en Neubox; la app móvil de El Narrador
sigue usando Supabase, así que el contenido ya no se comparte entre ambos.

## Videos de YouTube en la portada

La portada muestra los últimos videos del canal de YouTube. Se configura en
`src/lib/youtube/config.ts` con el handle del canal (`@ElNarradordeMéxico`) o,
de forma más confiable, con el ID interno (`UC...`, visible en YouTube
Studio). No requiere API key (usa el feed RSS público del canal). Sin canal
configurado, o si YouTube no responde, la sección simplemente no se muestra.
