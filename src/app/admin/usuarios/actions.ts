"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, requireAdmin } from "@/lib/auth/session";
import { addAdminUser, getAdminUsers, removeAdminUser, setAdminPassword, type AdminUser } from "@/lib/db/admin-users";

const MIN_PASSWORD_LENGTH = 8;
const ROLES: AdminUser["role"][] = ["owner", "editor", "writer"];

export async function listUsersAction(): Promise<
  { error: string } | { users: AdminUser[]; currentUserId: string; currentUserRole: AdminUser["role"] }
> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  const users = await getAdminUsers();
  return { users, currentUserId: auth.user.id, currentUserRole: auth.user.role };
}

export async function addUserAction(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  if (auth.user.role !== "owner") {
    return { error: "Solo los propietarios pueden agregar usuarios" };
  }

  const email = String(formData.get("email") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const role = formData.get("role") as AdminUser["role"];
  const password = String(formData.get("password") ?? "");

  if (!email || !displayName || !role || !password) {
    return { error: "Todos los campos son obligatorios" };
  }
  if (!ROLES.includes(role)) return { error: "Rol no válido" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` };
  }

  const result = await addAdminUser(email, displayName, role, await hashPassword(password));
  if (result.error) return { error: result.error };

  revalidatePath("/admin/usuarios");
  return { success: true };
}

/** Un propietario puede cambiar la contraseña de cualquiera; los demás solo la suya. */
export async function changePasswordAction(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (id !== auth.user.id && auth.user.role !== "owner") {
    return { error: "Solo los propietarios pueden cambiar contraseñas de otros usuarios" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` };
  }

  await setAdminPassword(id, await hashPassword(password));
  return { success: true };
}

export async function removeUserAction(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  if (auth.user.role !== "owner") {
    return { error: "Solo los propietarios pueden eliminar usuarios" };
  }

  const id = formData.get("id") as string;

  // Prevent owner from removing themselves
  if (id === auth.user.id) {
    return { error: "No puedes eliminarte a ti mismo" };
  }

  const result = await removeAdminUser(id);
  if (result.error) return { error: result.error };

  revalidatePath("/admin/usuarios");
  return { success: true };
}
