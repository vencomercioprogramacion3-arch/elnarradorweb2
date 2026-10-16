# Pasar el sitio de Supabase a MySQL en Neubox

El sitio ya no usa Supabase: lee y escribe en una base **MySQL** del hosting
Neubox (la que ves en **phpMyAdmin**), el login del panel `/admin` usa
usuarios y contraseñas guardados en esa base, y las imágenes/PDFs nuevos se
guardan en una carpeta de tu hosting.

> ⚠️ **La app móvil sigue en Supabase.** Desde que hagas el cambio, las notas
> nuevas del sitio ya no aparecerán en la app (y viceversa). No borres el
> proyecto de Supabase: además las imágenes y PDFs antiguos siguen alojados
> ahí y sus URLs continúan funcionando.

Archivos de esta carpeta:

| Archivo | Para qué |
|---|---|
| `schema.sql` | Crea las tablas en MySQL (se importa en phpMyAdmin) |
| `media/upload.php` | Recibe las imágenes/PDFs que sube el panel y los guarda en `media/uploads/` |
| `media/config.example.php` | Plantilla de `config.php` (clave secreta y URL pública) |
| `media/.htaccess`, `media/uploads/.htaccess`, `media/.user.ini` | Seguridad y límite de subida (64 MB) |

Y en `scripts/`:

| Script | Para qué |
|---|---|
| `export-supabase-to-mysql.mjs` | Copia las notas, revistas, categorías, autores y usuarios de Supabase a archivos `.sql` |
| `hash-password.mjs` | Genera la contraseña cifrada para crear el primer usuario del panel |

---

## 1. Crear la base de datos en Neubox

1. Entra al **cPanel** de Neubox → **Bases de datos MySQL**.
2. Crea una base (p.ej. `usuario_narrador`) y un usuario con contraseña
   larga. Agrega el usuario a la base con **TODOS LOS PRIVILEGIOS**.
3. Abre **phpMyAdmin**, selecciona la base → pestaña **Importar** → sube
   `neubox/schema.sql`.

## 2. Copiar los datos desde Supabase

En tu computadora, dentro del proyecto:

```bash
SUPABASE_URL=https://fewwvcrfhdgnpfjyadev.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<la clave service-role> \
node scripts/export-supabase-to-mysql.mjs
```

Se generan archivos en `neubox/export/`. Impórtalos en phpMyAdmin
(**Importar**) en este orden: `categories.sql`, `news.sql`, `magazines.sql`,
`authors.sql`, `news_authors.sql`, `admin_users.sql`.

Si `news.sql` es muy grande para el límite de phpMyAdmin, comprímelo en
`.zip` o `.gz` antes de subirlo (phpMyAdmin acepta archivos comprimidos).

## 3. Contraseñas del panel

Supabase no permite exportar contraseñas, así que hay que crear nuevas.
Genera la tuya:

```bash
node scripts/hash-password.mjs "tu-contraseña-segura"
```

El script imprime un `INSERT ... ON DUPLICATE KEY UPDATE` listo para pegar
en la pestaña **SQL** de phpMyAdmin (cambia el correo y nombre). Con
`role = 'owner'` podrás entrar a `/admin/usuarios` y asignar contraseña a los
demás con el botón **Contraseña**.

## 4. Permitir que Cloudflare se conecte a MySQL

El sitio corre en Cloudflare, fuera de Neubox, así que MySQL debe aceptar
conexiones remotas:

1. cPanel → **MySQL remoto** (Remote MySQL) → agrega el host `%`.
   Cloudflare no tiene una IP fija, por eso tiene que ser `%`; usa una
   contraseña larga para el usuario de la base.
2. Anota el **host** del servidor MySQL (normalmente el dominio o la IP del
   servidor que aparece en cPanel) y el puerto (`3306`).
3. Prueba desde tu computadora:
   `mysql -h <host> -u <usuario> -p <base>` (o cualquier cliente como
   DBeaver/MySQL Workbench). Si no conecta, pide a soporte de Neubox que
   habilite el acceso remoto a MySQL para tu plan; algunos planes
   compartidos lo bloquean y entonces esta opción no funciona.

**Recomendado: Cloudflare Hyperdrive.** Mantiene conexiones abiertas cerca de
la base y hace el sitio mucho más rápido:

```bash
npx wrangler hyperdrive create narrador-mysql \
  --connection-string="mysql://USUARIO:CONTRASEÑA@HOST:3306/BASE"
```

Copia el `id` que te devuelve en el bloque `[[hyperdrive]]` de
`wrangler.toml` (está comentado) y descoméntalo. Si existe el binding
`HYPERDRIVE`, el sitio lo usa; si no, se conecta directo con las variables
`MYSQL_*`.

## 5. Subir la carpeta de archivos

1. Con el **Administrador de archivos** de cPanel (o FTP) sube el contenido de
   `neubox/media/` a `public_html/media/` (incluye los archivos que empiezan
   con punto: `.htaccess` y `.user.ini`).
2. Copia `config.example.php` como `config.php` y rellena:
   - `UPLOAD_KEY`: una clave aleatoria larga (p.ej. `openssl rand -hex 32`).
   - `PUBLIC_BASE_URL`: `https://tudominio.com/media`.
3. Verifica que `https://tudominio.com/media/config.php` dé error 403.

> Si `elnarradordemexico.com` ya apunta a Cloudflare, usa otro dominio o
> subdominio que sí apunte al hosting de Neubox (p.ej.
> `media.elnarradordemexico.com` apuntando al servidor de Neubox).

## 6. Variables de entorno en Cloudflare

En **Cloudflare → Workers & Pages → proyecto → Settings → Variables and Secrets**
(o `npx wrangler secret put NOMBRE`):

| Variable | Tipo | Valor |
|---|---|---|
| `MYSQL_HOST` | Variable | Host de MySQL de Neubox |
| `MYSQL_PORT` | Variable | `3306` |
| `MYSQL_USER` | Variable | Usuario de la base |
| `MYSQL_PASSWORD` | **Secret** | Contraseña del usuario |
| `MYSQL_DATABASE` | Variable | Nombre de la base |
| `AUTH_SECRET` | **Secret** | Clave aleatoria de 32+ caracteres para firmar la sesión del panel |
| `NEUBOX_UPLOAD_URL` | Variable | `https://tudominio.com/media/upload.php` |
| `NEUBOX_UPLOAD_KEY` | **Secret** | La misma `UPLOAD_KEY` de `config.php` |

Ya no se usan: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` ni `ADMIN_EMAIL`. Puedes borrarlas.

Las variables `MYSQL_*` también deben estar disponibles al ejecutar
`npm run build`, porque algunas páginas se generan durante el build.

## 7. Desplegar y probar

```bash
npm run deploy
```

Revisa: portada, una categoría, una nota, búsqueda, `/revistas`, y en
`/admin`: iniciar sesión, publicar una nota con imagen, subir una revista,
marcar destacada / última hora, borrar una nota y agregar un usuario.

## Imágenes del WordPress anterior

Las notas importadas de WordPress apuntan a
`https://elnarradordemexico.com/wp-content/uploads/...` (o a su copia en
`i0.wp.com`). Esos archivos siguen en Neubox, pero el dominio ahora apunta a
Cloudflare. El sitio reescribe esas URLs a `https://wp.elnarradordemexico.com/wp-content/...`
(`src/lib/legacy-media.ts`) y redirige cualquier `/wp-content/...` ahí.

1. cPanel → **Dominios** → crear `wp.elnarradordemexico.com` con raíz del
   documento en la carpeta del WordPress (la que contiene `wp-content/`,
   normalmente `/home/<usuario>/public_html`).
2. Cloudflare → DNS → registro `A` `wp` → IP del servidor de Neubox (DNS only).
3. cPanel → **SSL/TLS Status** → **Run AutoSSL**.
4. Probar una imagen: `https://wp.elnarradordemexico.com/wp-content/uploads/...`.
