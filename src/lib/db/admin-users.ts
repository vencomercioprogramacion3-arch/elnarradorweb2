import { query, queryOne, execute } from "./mysql";

export type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "editor" | "writer";
  created_at: string;
};

// Nunca seleccionar password_hash salvo en el login
const PUBLIC_COLUMNS = "id, email, display_name, role, created_at";

/**
 * Check if the given email is an authorized admin user.
 * Returns the admin user record or null.
 */
export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  return queryOne<AdminUser>(`SELECT ${PUBLIC_COLUMNS} FROM admin_users WHERE email = ?`, [
    email.toLowerCase().trim(),
  ]);
}

/** Only for login: returns the stored password hash too. */
export async function getAdminCredentials(email: string) {
  return queryOne<AdminUser & { password_hash: string | null }>(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM admin_users WHERE email = ?`,
    [email.toLowerCase().trim()]
  );
}

/**
 * Get all admin users (for the management page).
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  return query<AdminUser>(`SELECT ${PUBLIC_COLUMNS} FROM admin_users ORDER BY created_at ASC`);
}

/**
 * Add a new admin user with an already-hashed password.
 */
export async function addAdminUser(
  email: string,
  displayName: string,
  role: AdminUser["role"],
  passwordHash: string
) {
  try {
    await execute(
      "INSERT INTO admin_users (id, email, display_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), email.toLowerCase().trim(), displayName.trim(), role, passwordHash, new Date()]
    );
    return { success: true };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") return { error: "Ya existe un usuario con ese correo." };
    return { error: err instanceof Error ? err.message : "Error desconocido" };
  }
}

export async function setAdminPassword(id: string, passwordHash: string) {
  await execute("UPDATE admin_users SET password_hash = ? WHERE id = ?", [passwordHash, id]);
}

/**
 * Remove an admin user by id.
 */
export async function removeAdminUser(id: string) {
  try {
    await execute("DELETE FROM admin_users WHERE id = ?", [id]);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error desconocido" };
  }
}
