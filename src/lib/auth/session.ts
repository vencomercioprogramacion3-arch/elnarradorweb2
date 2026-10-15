import { cookies } from "next/headers";
import { getAdminUserByEmail, type AdminUser } from "@/lib/db/admin-users";

/**
 * Login propio del panel /admin (reemplaza Supabase Auth).
 *
 * - Contraseñas: PBKDF2-SHA256 con sal aleatoria, guardadas en
 *   admin_users.password_hash como `pbkdf2_sha256$<iter>$<sal>$<hash>`.
 * - Sesión: cookie httpOnly firmada con HMAC usando AUTH_SECRET. En cada
 *   request se vuelve a consultar admin_users, así que borrar a un usuario le
 *   quita el acceso de inmediato.
 *
 * Solo usa Web Crypto, que existe tanto en Node como en Cloudflare Workers.
 */

export const SESSION_COOKIE = "narrador_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días
// Cloudflare Workers no permite más de 100,000 iteraciones de PBKDF2
const PBKDF2_ITERATIONS = 100_000;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  const parts = stored?.split("$");
  if (!parts || parts.length !== 4 || parts[0] !== "pbkdf2_sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;

  const expected = fromBase64Url(parts[3]);
  const actual = await pbkdf2(password, fromBase64Url(parts[2]), iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function hmacKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET no está configurado (mínimo 32 caracteres).");
  }
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function createSessionToken(email: string) {
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }))
  );
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

async function readSessionEmail(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64Url(signature) as BufferSource,
      encoder.encode(payload)
    );
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { e?: string; x?: number };
    if (!data.e || !data.x || data.x < Date.now() / 1000) return null;
    return data.e;
  } catch {
    return null;
  }
}

export async function startSession(email: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSessionToken(email.toLowerCase()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** The logged-in admin user, or null if there is no valid session. */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const email = await readSessionEmail(cookieStore.get(SESSION_COOKIE)?.value);
  if (!email) return null;
  return getAdminUserByEmail(email);
}

/**
 * Verifies that the caller is an authenticated admin. The admin layout already
 * guards the UI, but server actions are public POST endpoints and must enforce
 * auth themselves.
 */
export async function requireAdmin(): Promise<{ error: string } | { user: AdminUser }> {
  const user = await getCurrentAdmin();
  if (!user) {
    return { error: "Tu sesión expiró. Recarga la página e inicia sesión de nuevo." };
  }
  return { user };
}
