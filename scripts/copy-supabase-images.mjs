#!/usr/bin/env node
// Copia las imágenes de las notas que siguen en Supabase Storage al hosting de
// Neubox (media/upload.php) y actualiza news.image_url en MySQL.
//
// Uso (desde la carpeta del proyecto, con las variables en .env.local):
//   node --env-file=.env.local scripts/copy-supabase-images.mjs            # prueba, no cambia nada
//   node --env-file=.env.local scripts/copy-supabase-images.mjs --apply    # copia y actualiza
//   node --env-file=.env.local scripts/copy-supabase-images.mjs --apply --limit=500
//
// Variables: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE,
// NEUBOX_UPLOAD_URL, NEUBOX_UPLOAD_KEY y opcional SUPABASE_SERVICE_ROLE_KEY
// (si se define, descarga con la clave de servicio en lugar de la URL pública).
//
// Procesa primero las notas más recientes. Es seguro repetirlo: las notas ya
// copiadas dejan de apuntar a Supabase y no se vuelven a tocar.
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 100);

const required = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE", "NEUBOX_UPLOAD_URL", "NEUBOX_UPLOAD_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Faltan variables: ${missing.join(", ")}`);
  process.exit(1);
}

const UPLOAD_URL = process.env.NEUBOX_UPLOAD_URL;
const UPLOAD_KEY = process.env.NEUBOX_UPLOAD_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Nombre válido para upload.php: minúsculas, [a-z0-9._-], extensión permitida. */
function targetName(url, contentType) {
  const base = decodeURIComponent(new URL(url).pathname.split("/").pop() || "imagen");
  const stem = base
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .slice(0, 150);
  const ext = EXT_BY_TYPE[contentType] ?? "jpg";
  return `${stem || "imagen"}.${ext}`;
}

/** URL pública .../object/public/<bucket>/<ruta> → endpoint autenticado. */
function authenticatedUrl(publicUrl) {
  return publicUrl.replace("/storage/v1/object/public/", "/storage/v1/object/");
}

async function download(url) {
  const res = SERVICE_KEY
    ? await fetch(authenticatedUrl(url), { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } })
    : await fetch(url);
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`Supabase respondió ${res.status}: ${body}`);
  }
  const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (!EXT_BY_TYPE[contentType]) throw new Error(`No es una imagen (${contentType || "sin tipo"})`);
  return { blob: new Blob([await res.arrayBuffer()], { type: contentType }), contentType };
}

async function upload(blob, name) {
  const form = new FormData();
  form.set("folder", "news");
  form.set("name", name);
  form.set("file", blob, name);
  const res = await fetch(UPLOAD_URL, { method: "POST", headers: { "X-Upload-Key": UPLOAD_KEY }, body: form });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.url) return data.url;
  // Ya se había subido en una ejecución anterior: reutilizarla
  if (res.status === 409) return UPLOAD_URL.replace(/upload\.php$/, `uploads/news/${name}`);
  throw new Error(`Neubox respondió ${res.status}: ${data.error || "sin detalle"}`);
}

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE,
  charset: "utf8mb4",
});

const [rows] = await db.query(
  `SELECT id, title, image_url FROM news
   WHERE image_url LIKE '%supabase.co/storage/%'
   ORDER BY published_at DESC LIMIT ?`,
  [LIMIT]
);

console.log(`${rows.length} notas con imagen en Supabase (límite ${LIMIT}). ${APPLY ? "COPIANDO" : "MODO PRUEBA (usa --apply para copiar)"}\n`);

let ok = 0;
let failed = 0;
for (const [i, row] of rows.entries()) {
  const label = `[${i + 1}/${rows.length}] ${String(row.title).slice(0, 60)}`;
  try {
    const { blob, contentType } = await download(row.image_url);
    const name = targetName(row.image_url, contentType);
    if (!APPLY) {
      console.log(`✔ ${label}\n    se descargaría y subiría como ${name} (${Math.round(blob.size / 1024)} KB)`);
      ok++;
      continue;
    }
    const newUrl = await upload(blob, name);
    await db.query("UPDATE news SET image_url = ? WHERE id = ?", [newUrl, row.id]);
    console.log(`✔ ${label}\n    → ${newUrl}`);
    ok++;
  } catch (err) {
    console.log(`✘ ${label}\n    ${err.message}`);
    failed++;
    // Si Supabase sigue bloqueando, todas las demás también fallarán
    if (failed >= 5 && ok === 0) {
      console.log("\nLas primeras 5 fallaron: Supabase sigue bloqueando las descargas. Se detiene aquí.");
      break;
    }
  }
}

await db.end();
console.log(`\nListo: ${ok} correctas, ${failed} con error.`);
