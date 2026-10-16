# Base de datos (MySQL en Neubox)

El sitio usa una base **MySQL/MariaDB** en el hosting Neubox (administrada con
phpMyAdmin). El esquema completo está en [`neubox/schema.sql`](../neubox/schema.sql)
y la guía de configuración en [`neubox/README.md`](../neubox/README.md).

Antes el sitio compartía la base de Supabase (`fewwvcrfhdgnpfjyadev`) con la app
móvil. **La app móvil sigue en Supabase**: el contenido ya no se sincroniza
entre ambos. Las imágenes y PDFs antiguos siguen alojados en Supabase Storage.

## Acceso desde el código

- `src/lib/db/mysql.ts`: conexión (`mysql2`). En Cloudflare abre una conexión
  por consulta usando el binding Hyperdrive `HYPERDRIVE` si existe, o las
  variables `MYSQL_*`; en Node (`next dev` / build) usa un pool.
  - Las fechas se guardan en **UTC** y se devuelven como string ISO.
  - `TINYINT(1)` se devuelve como `boolean`.
  - Helpers: `query`, `queryOne`, `execute`. Siempre con placeholders `?`.
- `src/lib/db/queries.ts`, `src/lib/db/magazines.ts`, `src/lib/db/admin-users.ts`.

## Tablas

### `news` — notas del sitio
| Columna | Tipo | Notas |
|---|---|---|
| `id` | varchar(64) PK | UUID generado por el sitio, o `wp-<id>` para WordPress |
| `source` | varchar | `'supabase'` (creada en el panel, valor histórico) o `'wordpress'` |
| `title`, `summary`, `content` | text | `content` es HTML sanitizado |
| `image_url` | varchar | URL de Neubox (`/media/uploads/news/...`), Supabase (antiguas) o externa |
| `category_slug`, `category_name` | varchar | El slug debe existir en `categoryMap` de `src/app/[category]/page.tsx` |
| `author_name` | varchar | Texto libre (autofill desde `admin_users.display_name`) |
| `tags` | json | Arreglo de strings |
| `published_at`, `created_at` | datetime (UTC) | El orden público usa `published_at` |
| `view_count` | int | |
| `is_featured`, `is_breaking` | tinyint(1) | Portada destacada / última hora |
| `status` | varchar | default `'published'` |
| `source_url` | varchar | URL original (WordPress) |

### `magazines` — revistas en PDF
`id`, `title`, `description`, `edition`, `cover_image_url`, `pdf_url`,
`published_at`, `created_at`, `is_featured`, `view_count`, `download_count`.

### `categories`
`id` (slug), `name`, `sort_order`. El sitio también mantiene una copia en
código en `src/app/[category]/page.tsx`; si se agrega una categoría hay que
actualizar ambos lados.

### `admin_users` — usuarios del panel
| Columna | Notas |
|---|---|
| `email` | único, en minúsculas |
| `display_name` | Autofill del campo "Autor" |
| `role` | `owner` / `editor` / `writer` |
| `password_hash` | `pbkdf2_sha256$<iter>$<sal>$<hash>`; lo genera el sitio o `scripts/hash-password.mjs` |

### `authors` y `news_authors`
Autores normalizados y su relación N:M con `news` (borrar una nota borra sus
filas en `news_authors`). El sitio los lee con `getAuthorsByNewsId()`.

## Autenticación

`src/lib/auth/session.ts`: el login verifica la contraseña contra
`admin_users.password_hash` y guarda una cookie httpOnly firmada con
`AUTH_SECRET`. En cada request se vuelve a buscar el usuario en `admin_users`,
así que eliminarlo le quita el acceso al instante. `requireAdmin()` es
obligatorio en todo server action del panel.

## Archivos (imágenes y PDFs)

`src/lib/storage/neubox.ts` envía cada archivo a `media/upload.php` en el
hosting (cabecera `X-Upload-Key` = `NEUBOX_UPLOAD_KEY`), que lo guarda en
`media/uploads/news/` o `media/uploads/magazines/` y devuelve la URL pública.

## Seguridad

- El usuario MySQL solo debe tener permisos sobre esta base, con contraseña
  larga (el acceso remoto queda abierto a `%` porque Cloudflare no tiene IP fija).
- La base no tiene RLS: toda escritura pasa por server actions que llaman a
  `requireAdmin()`. Nunca exponer las credenciales `MYSQL_*` al navegador.
