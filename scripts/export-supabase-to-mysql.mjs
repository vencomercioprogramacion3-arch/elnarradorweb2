#!/usr/bin/env node
// Exporta las tablas que usa el sitio web desde Supabase a archivos .sql
// listos para importar en phpMyAdmin (Neubox), después de neubox/schema.sql.
//
// Uso:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/export-supabase-to-mysql.mjs
//
// Genera neubox/export/<tabla>.sql (carpeta ignorada por git). Las imágenes y
// PDFs no se copian: sus URLs siguen apuntando a Supabase Storage.
import { mkdir, writeFile } from "node:fs/promises";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error("Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Solo se exportan las columnas que existen en neubox/schema.sql.
// El orden importa por las llaves foráneas de news_authors.
const TABLES = {
  categories: ["id", "name", "sort_order"],
  news: [
    "id", "source", "title", "summary", "content", "image_url", "category_slug", "category_name",
    "author_name", "tags", "published_at", "created_at", "view_count", "is_featured", "is_breaking",
    "status", "source_url",
  ],
  magazines: [
    "id", "title", "description", "edition", "cover_image_url", "pdf_url", "published_at",
    "created_at", "is_featured", "view_count", "download_count",
  ],
  admin_users: ["id", "email", "display_name", "role", "created_at"],
  authors: ["id", "name", "bio", "avatar_url", "email", "created_at"],
  news_authors: ["news_id", "author_id"],
};
const DATE_COLUMNS = new Set(["published_at", "created_at"]);
const JSON_COLUMNS = new Set(["tags"]);
const PAGE = 1000;
const ROWS_PER_INSERT = 25;

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        Range: `${from}-${from + PAGE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

function sqlString(text) {
  return (
    "'" +
    String(text).replace(/[\0\n\r\x1a'"\\]/g, (c) =>
      ({ "\0": "\\0", "\n": "\\n", "\r": "\\r", "\x1a": "\\Z", "'": "\\'", '"': '\\"', "\\": "\\\\" })[c]
    ) +
    "'"
  );
}

function toSql(column, value) {
  if (value === null || value === undefined) return "NULL";
  if (DATE_COLUMNS.has(column)) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "NULL";
    return sqlString(date.toISOString().slice(0, 19).replace("T", " ")); // UTC
  }
  if (JSON_COLUMNS.has(column)) return sqlString(JSON.stringify(value));
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return sqlString(JSON.stringify(value));
  return sqlString(value);
}

await mkdir(new URL("../neubox/export/", import.meta.url), { recursive: true });

for (const [table, columns] of Object.entries(TABLES)) {
  const rows = await fetchAll(table);
  const lines = ["SET NAMES utf8mb4;", "SET FOREIGN_KEY_CHECKS = 0;"];
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const values = rows
      .slice(i, i + ROWS_PER_INSERT)
      .map((row) => `(${columns.map((c) => toSql(c, row[c])).join(", ")})`);
    lines.push(`INSERT IGNORE INTO ${table} (${columns.join(", ")}) VALUES\n${values.join(",\n")};`);
  }
  lines.push("SET FOREIGN_KEY_CHECKS = 1;");
  const file = new URL(`../neubox/export/${table}.sql`, import.meta.url);
  await writeFile(file, lines.join("\n") + "\n");
  console.log(`${table}: ${rows.length} filas -> neubox/export/${table}.sql`);
}

console.log(
  "\nListo. admin_users se exporta SIN contraseñas: asigna una a cada usuario con\n" +
    "node scripts/hash-password.mjs (o desde /admin/usuarios una vez que entres)."
);
