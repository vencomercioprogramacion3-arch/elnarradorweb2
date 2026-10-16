#!/usr/bin/env node
// Diagnostica por qué un usuario no puede entrar al panel /admin.
// Usa la misma base y el mismo algoritmo que el sitio. No cambia nada.
//
// Uso (con las variables MYSQL_* en .env.local):
//   node --env-file=.env.local scripts/check-login.mjs tu@correo.com
// La contraseña se pide al ejecutar (escríbela y presiona Enter).
import { webcrypto as crypto } from "node:crypto";
import { createInterface } from "node:readline/promises";
import mysql from "mysql2/promise";

const email = (process.argv[2] || "").toLowerCase().trim();
if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/check-login.mjs tu@correo.com");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("Contraseña: ");
rl.close();

const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE,
  charset: "utf8mb4",
});
console.log(`\nBase: ${process.env.MYSQL_DATABASE} en ${process.env.MYSQL_HOST}`);

const [rows] = await db.query(
  "SELECT id, email, role, password_hash FROM admin_users WHERE email = ?",
  [email]
);
const [similar] = await db.query(
  "SELECT email FROM admin_users WHERE LOWER(TRIM(email)) LIKE ?",
  [`%${email.split("@")[0]}%`]
);
await db.end();

if (rows.length === 0) {
  console.log(`✘ No hay ningún usuario con el correo exacto "${email}".`);
  if (similar.length) console.log("  Correos parecidos en la tabla:", similar.map((r) => JSON.stringify(r.email)).join(", "));
  process.exit(0);
}
if (rows.length > 1) {
  console.log(`✘ Hay ${rows.length} usuarios con ese correo. El sitio toma solo uno; deja uno y borra los demás.`);
}

const b64 = (s) => Uint8Array.from(Buffer.from(s, "base64url"));
for (const row of rows) {
  console.log(`\nUsuario id=${row.id} rol=${row.role}`);
  const stored = row.password_hash;
  const parts = stored?.split("$");
  if (!stored) {
    console.log("  ✘ password_hash está vacío: asígnale una contraseña.");
    continue;
  }
  if (stored !== stored.trim()) console.log("  ✘ password_hash tiene espacios al inicio o al final.");
  if (!parts || parts.length !== 4 || parts[0] !== "pbkdf2_sha256") {
    console.log(`  ✘ password_hash no tiene el formato esperado (pbkdf2_sha256$100000$...$...). Empieza con: ${stored.slice(0, 25)}`);
    continue;
  }
  const iterations = Number(parts[1]);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64(parts[2]), iterations }, key, 256)
  );
  const matches = Buffer.from(bits).equals(Buffer.from(b64(parts[3])));
  console.log(matches ? "  ✔ La contraseña es correcta para este usuario." : "  ✘ La contraseña NO coincide con el hash guardado.");
  if (!role(row.role)) console.log(`  ⚠ El rol "${row.role}" no es owner/editor/writer.`);
}

function role(r) {
  return ["owner", "editor", "writer"].includes(r);
}
