"use client";

import { useState, useEffect, useCallback } from "react";
import { addUserAction, changePasswordAction, listUsersAction, removeUserAction } from "./actions";

type AdminUser = {
  id: string;
  email: string;
  display_name: string;
  role: "owner" | "editor" | "writer";
  created_at: string;
};

const roleLabels: Record<string, { label: string; color: string }> = {
  owner: { label: "Propietario", color: "bg-amber-100 text-amber-800" },
  editor: { label: "Editor", color: "bg-blue-100 text-blue-800" },
  writer: { label: "Redactor", color: "bg-green-100 text-green-800" },
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const result = await listUsersAction();

    if ("error" in result) {
      setError("Error al cargar usuarios: " + result.error);
      setLoading(false);
      return;
    }

    setUsers(result.users);
    setCurrentUserRole(result.currentUserRole);
    setCurrentUserId(result.currentUserId);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await addUserAction(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Usuario agregado exitosamente");
      setShowForm(false);
      (e.target as HTMLFormElement).reset();
      await fetchUsers();
    }
    setFormLoading(false);
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Estas seguro de eliminar a ${name}?`)) return;

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("id", id);
    const result = await removeUserAction(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Usuario eliminado");
      await fetchUsers();
    }
  }

  async function handleChangePassword(id: string, name: string) {
    const password = prompt(`Nueva contraseña para ${name} (mínimo 8 caracteres):`);
    if (!password) return;

    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("id", id);
    formData.set("password", password);
    const result = await changePasswordAction(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(`Contraseña de ${name} actualizada`);
    }
  }

  const isOwner = currentUserRole === "owner";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios del Panel</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Administra quien tiene acceso al panel de administracion
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-xl text-white font-semibold shadow-sm cursor-pointer transition-colors"
            style={{ background: "#1C1917" }}
          >
            {showForm ? "Cancelar" : "+ Agregar Usuario"}
          </button>
        )}
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 font-medium text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 font-medium text-sm">
          {error}
        </div>
      )}

      {/* Add user form */}
      {showForm && isOwner && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nuevo Usuario</h2>
          <p className="text-sm text-gray-500 mb-4">
            Comparte la contraseña con el usuario; podrá cambiarla desde esta pagina.
          </p>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Correo</label>
              <input
                name="email"
                type="email"
                required
                placeholder="usuario@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nombre</label>
              <input
                name="display_name"
                type="text"
                required
                placeholder="Nombre completo"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contraseña</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimo 8 caracteres"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rol</label>
              <select
                name="role"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
              >
                <option value="writer">Redactor</option>
                <option value="editor">Editor</option>
                <option value="owner">Propietario</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
              style={{ background: formLoading ? "#9CA3AF" : "#1C1917" }}
            >
              {formLoading ? "Agregando..." : "Agregar"}
            </button>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
          </h2>
        </div>
        {loading ? (
          <div className="px-5 py-12 text-center text-gray-400">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-400 mb-2">No hay usuarios registrados</p>
            <p className="text-sm text-gray-400">
              Crea la tabla <code className="bg-gray-100 px-1.5 py-0.5 rounded">admin_users</code> en
              phpMyAdmin y agrega el primer usuario.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {users.map((u) => {
              const roleMeta = roleLabels[u.role] || { label: u.role, color: "bg-gray-100 text-gray-700" };
              return (
                <div key={u.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shrink-0">
                      {u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{u.display_name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleMeta.color}`}>
                      {roleMeta.label}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {new Date(u.created_at).toLocaleDateString("es-MX", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {(isOwner || u.id === currentUserId) && (
                      <button
                        onClick={() => handleChangePassword(u.id, u.display_name)}
                        className="text-blue-500 hover:text-blue-700 text-sm cursor-pointer ml-2 transition-colors"
                        title="Cambiar contraseña"
                      >
                        Contraseña
                      </button>
                    )}
                    {isOwner && u.id !== currentUserId && (
                      <button
                        onClick={() => handleRemove(u.id, u.display_name)}
                        className="text-red-400 hover:text-red-600 text-sm cursor-pointer ml-2 transition-colors"
                        title="Eliminar usuario"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-blue-800 mb-2">Como agregar un nuevo usuario</h3>
        <ol className="text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
          <li>Un propietario agrega el correo, nombre, rol y una contrasena en esta pagina</li>
          <li>El usuario puede cambiar su contrasena con el boton &quot;Contraseña&quot;</li>
          <li>El usuario puede iniciar sesion en <code className="bg-blue-100 px-1 rounded">/admin/login</code></li>
        </ol>
      </div>
    </div>
  );
}
