# Despliegue a Cloudflare

El sitio se construye con [OpenNext para Cloudflare](https://opennext.js.org/cloudflare)
y se despliega a Cloudflare Pages con Wrangler. La configuración vive en
`wrangler.toml` y `open-next.config.ts`.

## Flujo normal

```bash
# Verificar antes de desplegar (lint + tipos + build de Next)
npm run build:next

# Probar localmente la salida real de Cloudflare
npm run preview

# Desplegar
npm run deploy
```

`npm run deploy` ejecuta el build de OpenNext (`.open-next/`) y luego
`wrangler pages deploy`. Necesitas estar autenticado con `npx wrangler login`
o tener `CLOUDFLARE_API_TOKEN` exportado.

## Variables de entorno en Cloudflare

`wrangler.toml` no contiene credenciales (solo el bloque opcional de
Hyperdrive). Las variables deben configurarse en el dashboard de Cloudflare
(**Pages > proyecto > Settings > Environment variables**) o con
`npx wrangler pages secret put <NOMBRE>`:

| Variable | Tipo | Notas |
|---|---|---|
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_DATABASE` | Variable | Base MySQL de Neubox |
| `MYSQL_PASSWORD` | **Secret** | Contraseña de la base |
| `AUTH_SECRET` | **Secret** | Firma la cookie de sesión del panel (32+ caracteres) |
| `NEUBOX_UPLOAD_URL` | Variable | URL de `media/upload.php` en Neubox |
| `NEUBOX_UPLOAD_KEY` | **Secret** | Clave compartida con `media/config.php` |
| `NEXT_PUBLIC_SITE_URL` | Variable | `https://elnarradordemexico.com` |
| `WORDPRESS_API_URL` | Variable | Solo si se usa la migración |
| `MIGRATION_SECRET_KEY` | **Secret** | Protege `POST /api/migrate` |

Configuración inicial de la base, archivos y Hyperdrive: ver
[`neubox/README.md`](./neubox/README.md).

Importante: las variables `NEXT_PUBLIC_*` se inyectan en el **build**, así que
si cambias alguna hay que volver a ejecutar `npm run deploy` (no basta con
cambiarla en el dashboard).

## Caché e ISR

Las páginas públicas exportan `revalidate = 300` (5 minutos) y los uploads del
admin llaman a `revalidatePath()`. En `open-next.config.ts` el incremental
cache de R2 está **deshabilitado** (comentado): cada request se renderiza
fresco en el worker, por lo que el contenido nuevo aparece de inmediato a
costa de algo más de carga sobre MySQL. Si el tráfico crece, habilitar el
R2 incremental cache siguiendo
[la guía de OpenNext](https://opennext.js.org/cloudflare/caching).

## Troubleshooting

- **El build falla con errores de tipos o lint**: es intencional; el proyecto
  ya no oculta errores (`next.config.ts` no usa `ignoreBuildErrors`). Corre
  `npm run typecheck` y `npm run lint` para ver el detalle.
- **El build falla al prerender categorías**: las páginas de categoría
  consultan MySQL durante el build. Verifica que las variables `MYSQL_*` estén
  disponibles en el entorno de build y que Neubox acepte conexiones remotas.
- **Una nota publicada no aparece en el sitio**: el insert va directo a la
  tabla `news`; verifica primero en `/admin/notas` que exista. Si existe pero
  no se ve en la portada, es un tema de caché del navegador o del CDN.
- **Error 413 / fallos al subir archivos grandes**: el límite de body de los
  server actions es 50 MB (`next.config.ts`). Los formularios validan antes:
  imágenes hasta 8 MB y PDFs hasta 50 MB. En Neubox el límite lo pone
  `media/.user.ini` (64 MB).
- **"No se pudo subir la imagen: No autorizado"**: `NEUBOX_UPLOAD_KEY` no
  coincide con `UPLOAD_KEY` de `media/config.php`.
