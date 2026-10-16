#!/usr/bin/env node
// Genera el password_hash para crear el primer usuario del panel en phpMyAdmin.
// Uso: node scripts/hash-password.mjs "mi contraseña"
// Mismo formato que src/lib/auth/session.ts (PBKDF2-SHA256, 100,000 iteraciones).
import { webcrypto as crypto } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error('Uso: node scripts/hash-password.mjs "contraseña de al menos 8 caracteres"');
  process.exit(1);
}

const ITERATIONS = 100_000;
const b64url = (bytes) => Buffer.from(bytes).toString("base64url");
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
const hash = `pbkdf2_sha256$${ITERATIONS}$${b64url(salt)}$${b64url(new Uint8Array(bits))}`;

console.log(hash);
console.log(`
Ejemplo para la pestaña SQL de phpMyAdmin:

INSERT INTO admin_users (id, email, display_name, role, password_hash, created_at)
VALUES (UUID(), 'tu@correo.com', 'Tu Nombre', 'owner', '${hash}', UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);`);
